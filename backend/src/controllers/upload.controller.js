import { createGuestSession } from "../services/guestSession.service.js"
import {
  createSignedUpload,
  deleteOwnedGuestImage,
  getOwnedGuestImage,
} from "../services/cloudinary.service.js"

function getPublicIdFromBody(body) {
  return typeof body?.publicId === "string" ? body.publicId.trim() : ""
}

export function createUploadController(
  config,
  cloudinaryClient,
  removeBackgroundImage,
) {
  return {
    createSession(_req, res) {
      res.status(201).json(createGuestSession(config.uploadSessionSecret))
    },

    createSignature(req, res) {
      res.json(
        createSignedUpload({
          sessionId: req.guestSession.sessionId,
          ...config.cloudinary,
        }),
      )
    },

    async verifyUpload(req, res) {
      const publicId = getPublicIdFromBody(req.body)
      if (!publicId || publicId.length > 255) {
        return res.status(400).json({ error: "A valid publicId is required." })
      }

      const asset = await getOwnedGuestImage({
        client: cloudinaryClient,
        sessionId: req.guestSession.sessionId,
        publicId,
      })
      res.json({ asset })
    },

    async deleteUpload(req, res) {
      const publicId = getPublicIdFromBody(req.body)
      if (!publicId || publicId.length > 255) {
        return res.status(400).json({ error: "A valid publicId is required." })
      }

      await deleteOwnedGuestImage({
        client: cloudinaryClient,
        sessionId: req.guestSession.sessionId,
        publicId,
      })
      res.status(204).end()
    },

    async removeBackground(req, res) {
      const publicId = getPublicIdFromBody(req.body)
      if (!publicId || publicId.length > 255) {
        return res.status(400).json({ error: "A valid publicId is required." })
      }

      const asset = await getOwnedGuestImage({
        client: cloudinaryClient,
        sessionId: req.guestSession.sessionId,
        publicId,
      })
      const result = await removeBackgroundImage({
        imageUrl: asset.secureUrl,
        apiKey: config.removeBgApiKey,
      })

      res.set({
        "Cache-Control": "no-store",
        "Content-Type": "image/png",
        "X-Content-Type-Options": "nosniff",
      })
      res.send(result)
    },
  }
}
