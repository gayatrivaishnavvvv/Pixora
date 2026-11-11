import cors from "cors"
import express from "express"
import rateLimit from "express-rate-limit"
import helmet from "helmet"
import mongoose from "mongoose"
import { createUploadRouter } from "./routes/upload.routes.js"
import { removeImageBackground } from "./services/backgroundRemoval.service.js"

export function createApp(
  config,
  cloudinaryClient,
  backgroundRemovalService = removeImageBackground,
) {
  const app = express()

  app.use(helmet())
  app.use(cors({ origin: config.frontendOrigins }))
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
    "/api/v1/uploads",
    createUploadRouter(config, cloudinaryClient, backgroundRemovalService),
  )

  app.use((_req, res) => {
    res.status(404).json({ error: "API route not found." })
  })

  app.use((error, _req, res, _next) => {
    console.error("API request failed:", error.message)
    const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 500
    const shouldExposeMessage =
      statusCode < 500 || [502, 503, 504].includes(statusCode)
    res.status(statusCode).json({
      error: shouldExposeMessage
        ? error.message
        : "The server could not complete the request.",
    })
  })

  return app
}
