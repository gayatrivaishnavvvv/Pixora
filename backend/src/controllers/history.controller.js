import axios from "axios"
import mongoose from "mongoose"
import {
  deleteGuestImageAsset,
  getOwnedGuestImage,
} from "../services/cloudinary.service.js"

const MAX_PAGE_SIZE = 50
const DEFAULT_PAGE_SIZE = 12
const EDITING_SETTING_KEYS = [
  "backgroundMode",
  "backgroundColor",
  "presetId",
  "positionX",
  "positionY",
  "scale",
  "exportFormat",
]
const BACKGROUND_MODES = ["transparent", "color", "preset", "image"]
const PRESET_IDS = ["warm", "sky", "sage", "lavender"]
const EXPORT_FORMATS = ["png", "jpeg", "webp"]

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function getPaginationValue(value, fallback, maximum = Number.MAX_SAFE_INTEGER) {
  const parsed = Number.parseInt(value, 10)
  return Number.isInteger(parsed) && parsed > 0
    ? Math.min(parsed, maximum)
    : fallback
}

function getEditingSettings(settings) {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    return null
  }
  const result = Object.fromEntries(
    EDITING_SETTING_KEYS.filter((key) => settings[key] !== undefined).map(
      (key) => [key, settings[key]],
    ),
  )
  if (
    Object.keys(result).length !== EDITING_SETTING_KEYS.length ||
    !BACKGROUND_MODES.includes(result.backgroundMode) ||
    !/^#[0-9a-f]{6}$/i.test(result.backgroundColor) ||
    !PRESET_IDS.includes(result.presetId) ||
    !Number.isFinite(result.positionX) ||
    result.positionX < 0 ||
    result.positionX > 100 ||
    !Number.isFinite(result.positionY) ||
    result.positionY < 0 ||
    result.positionY > 100 ||
    !Number.isFinite(result.scale) ||
    result.scale < 25 ||
    result.scale > 200 ||
    !EXPORT_FORMATS.includes(result.exportFormat)
  ) {
    return null
  }
  return result
}

function getThumbnailUrl(client, publicId, fallback) {
  if (!publicId || typeof client.url !== "function") return fallback
  return client.url(publicId, {
    secure: true,
    width: 420,
    height: 320,
    crop: "limit",
    quality: "auto",
    fetch_format: "auto",
  })
}

function presentImage(image, client) {
  const value = typeof image.toObject === "function" ? image.toObject() : image
  return {
    ...value,
    originalThumbnailUrl: getThumbnailUrl(
      client,
      value.originalPublicId,
      value.originalSecureUrl,
    ),
    processedThumbnailUrl: getThumbnailUrl(
      client,
      value.processedPublicId,
      value.processedSecureUrl,
    ),
    processedDownloadUrl: value.processedPublicId && typeof client.url === "function"
      ? client.url(value.processedPublicId, {
          secure: true,
          flags: "attachment",
        })
      : value.processedSecureUrl,
  }
}

function getHistoryOwnerFilter(req, expires = true) {
  if (req.historyOwner.userId) {
    return { ownerUserId: req.historyOwner.userId }
  }
  return {
    ownerSessionId: req.historyOwner.sessionId,
    ownerUserId: { $exists: false },
    ...(expires ? { expiresAt: { $gt: new Date() } } : {}),
  }
}

export function createHistoryController(
  imageModel,
  cloudinaryClient,
  config,
  fetchImage = axios.get,
) {
  return {
    async list(req, res) {
      const page = getPaginationValue(req.query.page, 1)
      const limit = getPaginationValue(
        req.query.limit,
        DEFAULT_PAGE_SIZE,
        MAX_PAGE_SIZE,
      )
      const filter = ["processed", "edited"].includes(req.query.filter)
        ? req.query.filter
        : "all"
      const search =
        typeof req.query.search === "string" ? req.query.search.trim() : ""
      const conditions = getHistoryOwnerFilter(req)

      if (search) {
        conditions.originalFilename = {
          $regex: escapeRegex(search.slice(0, 100)),
          $options: "i",
        }
      }
      if (filter === "processed") {
        conditions.processedPublicId = { $ne: null }
      } else if (filter === "edited") {
        conditions.status = "edited"
      }

      const sortOrder = req.query.sort === "oldest" ? 1 : -1
      const [images, total] = await Promise.all([
        imageModel
          .find(conditions)
          .sort({ createdAt: sortOrder })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        imageModel.countDocuments(conditions),
      ])

      res.json({
        images: images.map((image) => presentImage(image, cloudinaryClient)),
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      })
    },

    async get(req, res) {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(404).json({ error: "History image not found." })
      }
      const image = await imageModel
        .findOne({
          _id: req.params.id,
          ...getHistoryOwnerFilter(req),
        })
        .lean()
      if (!image) {
        return res.status(404).json({ error: "History image not found." })
      }
      res.json({ image: presentImage(image, cloudinaryClient) })
    },

    async getAsset(req, res) {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(404).json({ error: "History image not found." })
      }
      const image = await imageModel
        .findOne({
          _id: req.params.id,
          ...getHistoryOwnerFilter(req),
        })
        .lean()
      if (!image) {
        return res.status(404).json({ error: "History image not found." })
      }

      const isProcessed = req.params.kind === "processed"
      const secureUrl = isProcessed
        ? image.processedSecureUrl
        : req.params.kind === "original"
          ? image.originalSecureUrl
          : null
      const publicId = isProcessed
        ? image.processedPublicId
        : req.params.kind === "original"
          ? image.originalPublicId
          : null
      if (!secureUrl || !publicId) {
        return res.status(404).json({ error: "History image asset not found." })
      }

      const assetUrl = new URL(secureUrl)
      const cloudName = encodeURIComponent(config.cloudinary.cloudName)
      if (
        assetUrl.protocol !== "https:" ||
        assetUrl.hostname !== "res.cloudinary.com" ||
        !assetUrl.pathname.startsWith(`/${cloudName}/image/upload/`)
      ) {
        const error = new Error("The saved image asset URL is invalid.")
        error.statusCode = 502
        throw error
      }

      let response
      try {
        response = await fetchImage(assetUrl.href, {
          responseType: "arraybuffer",
          timeout: 20000,
          maxContentLength: 10 * 1024 * 1024,
        })
      } catch {
        const error = new Error("The saved image asset could not be retrieved from Cloudinary.")
        error.statusCode = 502
        throw error
      }

      const originalMimeType =
        image.originalFormat === "jpg" ? "image/jpeg" : `image/${image.originalFormat}`
      res.set({
        "Cache-Control": "private, no-store",
        "Content-Type": isProcessed ? "image/png" : originalMimeType,
        "X-Content-Type-Options": "nosniff",
      })
      res.send(Buffer.from(response.data))
    },

    async create(req, res) {
      const originalPublicId =
        typeof req.body?.originalPublicId === "string"
          ? req.body.originalPublicId.trim()
          : ""
      const originalFilename =
        typeof req.body?.originalFilename === "string"
          ? req.body.originalFilename.trim().split(/[\\/]/).pop().slice(0, 255)
          : ""
      if (!originalPublicId || !originalFilename) {
        return res.status(400).json({
          error: "An original image and filename are required.",
        })
      }

      if (!req.guestSession?.sessionId) {
        return res.status(401).json({ error: "A valid upload session is required." })
      }
      const asset = await getOwnedGuestImage({
        client: cloudinaryClient,
        sessionId: req.guestSession.sessionId,
        publicId: originalPublicId,
      })
      const existing = await imageModel.findOne({
        ...getHistoryOwnerFilter(req),
        originalPublicId: asset.publicId,
      })
      if (existing) {
        return res.status(200).json({ image: presentImage(existing, cloudinaryClient) })
      }

      const image = await imageModel.create({
        ...(req.historyOwner.userId
          ? { ownerUserId: req.historyOwner.userId }
          : {}),
        ownerSessionId: req.guestSession.sessionId,
        originalPublicId: asset.publicId,
        originalSecureUrl: asset.secureUrl,
        originalFormat: asset.format,
        originalFilename,
        status: "uploaded",
        dimensions: { width: asset.width, height: asset.height },
        fileSize: asset.bytes,
        ...(req.historyOwner.userId
          ? {}
          : { expiresAt: new Date(req.guestSession.expiresAt) }),
      })
      res.status(201).json({ image: presentImage(image, cloudinaryClient) })
    },

    async completeProcessing(req, res) {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(404).json({ error: "History image not found." })
      }
      const processedPublicId =
        typeof req.body?.processedPublicId === "string"
          ? req.body.processedPublicId.trim()
          : ""
      if (!processedPublicId) {
        return res.status(400).json({ error: "A processed image is required." })
      }

      const image = await imageModel.findOne({
        _id: req.params.id,
        ...getHistoryOwnerFilter(req),
      })
      if (!image) {
        return res.status(404).json({ error: "History image not found." })
      }
      if (!req.guestSession?.sessionId) {
        return res.status(401).json({ error: "A valid upload session is required." })
      }
      const asset = await getOwnedGuestImage({
        client: cloudinaryClient,
        sessionId: req.guestSession.sessionId,
        publicId: processedPublicId,
      })
      if (asset.format !== "png") {
        return res.status(422).json({ error: "The processed image must be a PNG." })
      }

      image.processedPublicId = asset.publicId
      image.processedSecureUrl = asset.secureUrl
      image.processedOwnerSessionId = req.guestSession.sessionId
      image.processedAt = new Date()
      image.status = "processed"
      await image.save()
      res.json({ image: presentImage(image, cloudinaryClient) })
    },

    async updateSettings(req, res) {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(404).json({ error: "History image not found." })
      }
      const backgroundSettings = getEditingSettings(req.body?.backgroundSettings)
      if (!backgroundSettings) {
        return res.status(400).json({ error: "Valid editing settings are required." })
      }
      const image = await imageModel.findOneAndUpdate(
        {
          _id: req.params.id,
          ...getHistoryOwnerFilter(req),
          processedPublicId: { $ne: null },
        },
        { $set: { backgroundSettings, status: "edited" } },
        { new: true, runValidators: true },
      )
      if (!image) {
        return res.status(404).json({ error: "Processed history image not found." })
      }
      res.json({ image: presentImage(image, cloudinaryClient) })
    },

    async remove(req, res) {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(404).json({ error: "History image not found." })
      }
      const image = await imageModel.findOne({
        _id: req.params.id,
        ...getHistoryOwnerFilter(req, false),
      })
      if (!image) {
        return res.status(404).json({ error: "History image not found." })
      }

      await deleteGuestImageAsset({
        client: cloudinaryClient,
        sessionId: image.ownerSessionId,
        publicId: image.originalPublicId,
      })
      if (image.processedPublicId) {
        await deleteGuestImageAsset({
          client: cloudinaryClient,
          sessionId: image.processedOwnerSessionId || image.ownerSessionId,
          publicId: image.processedPublicId,
        })
      }
      await imageModel.deleteOne({ _id: image._id })
      res.status(204).end()
    },
  }
}
