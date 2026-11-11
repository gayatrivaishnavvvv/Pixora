import { randomUUID } from "node:crypto"
import { v2 as cloudinary } from "cloudinary"

const ALLOWED_FORMATS = ["jpg", "png", "webp"]
const MAX_FILE_SIZE = 10 * 1024 * 1024

function normalizeGuestPublicId(publicId) {
  if (typeof publicId !== "string") {
    return ""
  }

  return publicId.trim().replace(/^\/+|\/+$/g, "")
}

function isOwnedGuestPublicId(sessionId, publicId) {
  const safeSessionId = typeof sessionId === "string" ? sessionId.trim() : ""
  const normalizedPublicId = normalizeGuestPublicId(publicId)

  if (!safeSessionId || !normalizedPublicId) {
    return false
  }

  const expectedPublicId = new RegExp(
    `^(?:pixora/guest/)?guest-${safeSessionId}-[0-9a-f-]{36}$`,
  )

  return expectedPublicId.test(normalizedPublicId)
}

export function createSignedUpload({ sessionId, cloudName, apiKey, apiSecret, uploadPreset }) {
  const timestamp = Math.floor(Date.now() / 1000)
  const folder = "pixora/guest"
  const publicId = `guest-${sessionId}-${randomUUID()}`
  const paramsToSign = {
    folder,
    public_id: publicId,
    timestamp,
    unique_filename: false,
    overwrite: false,
    upload_preset: uploadPreset,
  }
  const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret)

  return {
    cloudName,
    apiKey,
    uploadUrl: `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`,
    params: paramsToSign,
    signature,
    allowedFormats: ALLOWED_FORMATS,
    maxFileSize: MAX_FILE_SIZE,
  }
}

export async function getOwnedGuestImage({ client, sessionId, publicId }) {
  if (!isOwnedGuestPublicId(sessionId, publicId)) {
    const error = new Error("This upload does not belong to the current guest session.")
    error.statusCode = 403
    throw error
  }

  const asset = await client.api.resource(publicId, { resource_type: "image" })
  if (
    !ALLOWED_FORMATS.includes(asset.format) ||
    asset.bytes > MAX_FILE_SIZE ||
    asset.type !== "upload"
  ) {
    const error = new Error("The uploaded asset does not meet the image requirements.")
    error.statusCode = 422
    throw error
  }

  return {
    publicId: asset.public_id,
    secureUrl: asset.secure_url,
    format: asset.format,
    bytes: asset.bytes,
    width: asset.width,
    height: asset.height,
  }
}

export async function deleteOwnedGuestImage({ client, sessionId, publicId }) {
  const asset = await getOwnedGuestImage({ client, sessionId, publicId })
  const result = await client.uploader.destroy(asset.publicId, {
    resource_type: "image",
    invalidate: true,
  })

  if (result.result !== "ok" && result.result !== "not found") {
    const error = new Error("Cloudinary did not confirm image deletion.")
    error.statusCode = 502
    throw error
  }
}
