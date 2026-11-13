import cors from "cors"
import express from "express"
import rateLimit from "express-rate-limit"
import helmet from "helmet"
import mongoose from "mongoose"
import { Image } from "./models/Image.js"
import { GuestProcessingUsage } from "./models/GuestProcessingUsage.js"
import { User } from "./models/User.js"
import { createAuthRouter } from "./routes/auth.routes.js"
import { createHistoryRouter } from "./routes/history.routes.js"
import { createUploadRouter } from "./routes/upload.routes.js"
import { removeImageBackground } from "./services/backgroundRemoval.service.js"

export function createApp(
  config,
  cloudinaryClient,
  backgroundRemovalService = removeImageBackground,
  imageModel = Image,
  historyAssetFetcher,
  userModel = User,
  processingUsageModel = GuestProcessingUsage,
  googleTokenVerifier,
) {
  const app = express()

  app.use(helmet())
  app.use(cors({ origin: config.frontendOrigins, credentials: true }))
  app.use(express.json({ limit: "16kb" }))
  app.use(
    "/api/v1",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 120,
      standardHeaders: "draft-8",
      legacyHeaders: false,
    }),
  )

  app.get("/api/v1/health", (_req, res) => {
    const databaseConnected = mongoose.connection.readyState === 1
    res.status(databaseConnected ? 200 : 503).json({
      status: databaseConnected ? "ok" : "database_disconnected",
    })
  })
  app.use(
    "/api/v1/auth",
    createAuthRouter(config, userModel, imageModel, googleTokenVerifier),
  )
  app.use(
    "/api/v1/uploads",
    createUploadRouter(
      config,
      cloudinaryClient,
      backgroundRemovalService,
      processingUsageModel,
      userModel,
    ),
  )
  app.use(
    "/api/v1/history",
    createHistoryRouter(
      config,
      cloudinaryClient,
      imageModel,
      historyAssetFetcher,
      userModel,
    ),
  )

  app.use((_req, res) => {
    res.status(404).json({ error: "API route not found." })
  })

  app.use((error, _req, res, _next) => {
    const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 500
    if (statusCode >= 500) {
      console.error("API request failed:", error.message)
    }
    const shouldExposeMessage =
      statusCode < 500 || [502, 503, 504].includes(statusCode)
    const response = {
      error: shouldExposeMessage
        ? error.message
        : "The server could not complete the request.",
    }
    if (error.publicCode) response.code = error.publicCode
    res.status(statusCode).json(response)
  })

  return app
}
