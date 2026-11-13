import { randomUUID } from "node:crypto"

export const GUEST_FREE_IMAGE_LIMIT = 2

function createUsageError(message, statusCode, publicCode) {
  const error = new Error(message)
  error.statusCode = statusCode
  error.publicCode = publicCode
  return error
}

function findImageUsage(usage, originalPublicId) {
  return usage?.images?.find((image) => image.originalPublicId === originalPublicId)
}

export async function reserveGuestImageProcessing(
  usageModel,
  { sessionId, originalPublicId, expiresAt },
) {
  try {
    await usageModel.updateOne(
      { sessionId },
      { $setOnInsert: { sessionId, images: [], expiresAt } },
      { upsert: true },
    )
  } catch (error) {
    if (error.code !== 11000) throw error
  }

  const existingUsage = await usageModel
    .findOne({ sessionId, "images.originalPublicId": originalPublicId })
    .lean()
  const existingImage = findImageUsage(existingUsage, originalPublicId)
  if (existingImage?.status === "processed") return null
  if (existingImage) {
    throw createUsageError(
      "This image is already being processed. Wait a moment and try again.",
      409,
      "IMAGE_PROCESSING_IN_PROGRESS",
    )
  }

  const reservationId = randomUUID()
  const usage = await usageModel
    .findOneAndUpdate(
      {
        sessionId,
        "images.originalPublicId": { $ne: originalPublicId },
        $expr: { $lt: [{ $size: "$images" }, GUEST_FREE_IMAGE_LIMIT] },
      },
      {
        $push: {
          images: {
            originalPublicId,
            status: "processing",
            reservationId,
          },
        },
      },
      { new: true },
    )
    .lean()

  if (usage) return reservationId

  const latestUsage = await usageModel.findOne({ sessionId }).lean()
  const latestImage = findImageUsage(latestUsage, originalPublicId)
  if (latestImage?.status === "processed") return null
  if (latestImage) {
    throw createUsageError(
      "This image is already being processed. Wait a moment and try again.",
      409,
      "IMAGE_PROCESSING_IN_PROGRESS",
    )
  }
  throw createUsageError(
    "You’ve used the 2 free guest images. Create an account or sign in to process more.",
    403,
    "GUEST_PROCESSING_LIMIT",
  )
}

export async function completeGuestImageProcessing(
  usageModel,
  { sessionId, originalPublicId, reservationId },
) {
  if (!reservationId) return

  const result = await usageModel.updateOne(
    {
      sessionId,
      images: {
        $elemMatch: {
          originalPublicId,
          reservationId,
          status: "processing",
        },
      },
    },
    {
      $set: { "images.$.status": "processed" },
      $unset: { "images.$.reservationId": 1 },
    },
  )
  if (result.matchedCount !== 1) {
    throw new Error("The guest processing reservation could not be completed.")
  }
}

export async function releaseGuestImageProcessing(
  usageModel,
  { sessionId, originalPublicId, reservationId },
) {
  if (!reservationId) return

  await usageModel.updateOne(
    { sessionId },
    {
      $pull: {
        images: {
          originalPublicId,
          reservationId,
          status: "processing",
        },
      },
    },
  )
}
