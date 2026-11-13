import mongoose from "mongoose"

const guestProcessingImageSchema = new mongoose.Schema(
  {
    originalPublicId: { type: String, required: true },
    status: {
      type: String,
      enum: ["processing", "processed"],
      required: true,
    },
    reservationId: { type: String },
  },
  { _id: false },
)

const guestProcessingUsageSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, unique: true },
    images: { type: [guestProcessingImageSchema], default: [] },
    expiresAt: { type: Date, required: true, expires: 0 },
  },
  { timestamps: true },
)

export const GuestProcessingUsage =
  mongoose.models.GuestProcessingUsage ??
  mongoose.model("GuestProcessingUsage", guestProcessingUsageSchema)
