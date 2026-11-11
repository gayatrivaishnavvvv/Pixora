import dotenv from "dotenv"

dotenv.config()

export function getRequiredEnv(name) {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

export function getServerConfig() {
  const port = Number.parseInt(process.env.PORT ?? "5000", 10)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be a valid TCP port between 1 and 65535.")
  }

  const uploadSessionSecret = getRequiredEnv("UPLOAD_SESSION_SECRET")
  if (uploadSessionSecret.length < 32) {
    throw new Error("UPLOAD_SESSION_SECRET must be at least 32 characters long.")
  }

  return {
    port,
    frontendOrigins: (process.env.FRONTEND_URL ??
      "http://localhost:5173,http://127.0.0.1:5173")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
    mongoUri: getRequiredEnv("MONGODB_URI"),
    uploadSessionSecret,
    removeBgApiKey: process.env.REMOVE_BG_API_KEY?.trim() ?? "",
    cloudinary: {
      cloudName: getRequiredEnv("CLOUDINARY_CLOUD_NAME"),
      apiKey: getRequiredEnv("CLOUDINARY_API_KEY"),
      apiSecret: getRequiredEnv("CLOUDINARY_API_SECRET"),
      uploadPreset: getRequiredEnv("CLOUDINARY_UPLOAD_PRESET"),
    },
  }
}
