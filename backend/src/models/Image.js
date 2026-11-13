import mongoose from "mongoose"

const backgroundSettingsSchema = new mongoose.Schema(
  {
    backgroundMode: {
      type: String,
      enum: ["transparent", "color", "preset", "image"],
      default: "transparent",
    },
    backgroundColor: {
      type: String,
      match: /^#[0-9a-f]{6}$/i,
      default: "#ffffff",
    },
    presetId: {
      type: String,
      enum: ["warm", "sky", "sage", "lavender"],
      default: "warm",
    },
    positionX: { type: Number, min: 0, max: 100, default: 50 },
    positionY: { type: Number, min: 0, max: 100, default: 50 },
    scale: { type: Number, min: 25, max: 200, default: 100 },
    exportFormat: {
      type: String,
      enum: ["png", "jpeg", "webp"],
      default: "png",
    },
  },
  { _id: false },
)

const imageSchema = new mongoose.Schema(
  {
    ownerUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    ownerSessionId: { type: String, required: true, index: true },
    originalPublicId: { type: String, required: true },
    originalSecureUrl: { type: String, required: true },
    originalFormat: { type: String, enum: ["jpg", "png", "webp"], required: true },
    processedPublicId: { type: String, default: null },
    processedSecureUrl: { type: String, default: null },
    processedOwnerSessionId: { type: String, default: null },
    originalFilename: { type: String, required: true, trim: true, maxlength: 255 },
    status: {
      type: String,
      enum: ["uploaded", "processed", "edited"],
      default: "uploaded",
      required: true,
    },
    processedAt: { type: Date, default: null },
    backgroundSettings: {
      type: backgroundSettingsSchema,
      default: () => ({}),
    },
    dimensions: {
      width: { type: Number, required: true, min: 1 },
      height: { type: Number, required: true, min: 1 },
    },
    fileSize: { type: Number, required: true, min: 1 },
    expiresAt: { type: Date, index: true },
  },
  { timestamps: true },
)

imageSchema.pre("validate", function () {
  if (!this.ownerUserId && !this.expiresAt) {
    this.invalidate(
      "expiresAt",
      "Guest-owned image history must have an expiration date.",
    )
  }
})

imageSchema.index(
  { ownerSessionId: 1, originalPublicId: 1 },
  { unique: true },
)
imageSchema.index({ ownerSessionId: 1, createdAt: -1 })
imageSchema.index({ ownerUserId: 1, createdAt: -1 })

export const Image =
  mongoose.models.Image ?? mongoose.model("Image", imageSchema)
