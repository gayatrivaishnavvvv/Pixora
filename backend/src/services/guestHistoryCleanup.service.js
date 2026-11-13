import { deleteGuestImageAsset } from "./cloudinary.service.js"

const CLEANUP_INTERVAL_MS = 60 * 60 * 1000

export async function cleanupExpiredGuestHistory(imageModel, cloudinaryClient, now = new Date()) {
  const expiredImages = await imageModel.find({ expiresAt: { $lte: now } }).lean()
  let removed = 0

  for (const image of expiredImages) {
    try {
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
      removed += 1
    } catch (error) {
      console.error(`Could not clean up expired history image ${image._id}:`, error.message)
    }
  }

  return removed
}

export function startGuestHistoryCleanup(imageModel, cloudinaryClient) {
  const runCleanup = () =>
    cleanupExpiredGuestHistory(imageModel, cloudinaryClient).catch((error) => {
      console.error("Could not clean up expired guest image history:", error.message)
    })

  runCleanup()
  const interval = setInterval(runCleanup, CLEANUP_INTERVAL_MS)
  interval.unref()
  return interval
}
