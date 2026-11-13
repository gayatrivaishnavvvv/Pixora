import { Router } from "express"
import rateLimit from "express-rate-limit"
import { createUploadController } from "../controllers/upload.controller.js"
import { optionalAuthentication } from "../middleware/requireAuthentication.js"
import { requireGuestSession } from "../middleware/requireGuestSession.js"
import { GuestProcessingUsage } from "../models/GuestProcessingUsage.js"
import { User } from "../models/User.js"
import { removeImageBackground } from "../services/backgroundRemoval.service.js"

export function createUploadRouter(
  config,
  cloudinaryClient,
  backgroundRemovalService = removeImageBackground,
  processingUsageModel = GuestProcessingUsage,
  userModel = User,
) {
  const router = Router()
  const controller = createUploadController(
    config,
    cloudinaryClient,
    backgroundRemovalService,
    processingUsageModel,
  )
  const guestSession = requireGuestSession(config.uploadSessionSecret)
  const optionalUser = optionalAuthentication(config.authSessionSecret, userModel)
  const sessionLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Too many guest sessions. Please try again later." },
  })
  const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Too many upload requests. Please try again later." },
  })
  const processingLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Too many background-removal requests. Please try again later." },
  })

  router.post("/session", sessionLimiter, controller.createSession)
  router.post("/signature", uploadLimiter, guestSession, controller.createSignature)
  router.post("/verify", uploadLimiter, guestSession, controller.verifyUpload)
  router.post(
    "/remove-background",
    processingLimiter,
    guestSession,
    optionalUser,
    controller.removeBackground,
  )
  router.delete("/asset", uploadLimiter, guestSession, controller.deleteUpload)

  return router
}
