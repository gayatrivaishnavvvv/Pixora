import { Router } from "express"
import rateLimit from "express-rate-limit"
import { createAuthController } from "../controllers/auth.controller.js"
import {
  requireAuthentication,
  requireRequestVerification,
} from "../middleware/requireAuthentication.js"

export function createAuthRouter(
  config,
  userModel,
  imageModel,
  googleTokenVerifier,
) {
  const router = Router()
  const controller = createAuthController(
    config,
    userModel,
    imageModel,
    googleTokenVerifier,
  )
  const requireUser = requireAuthentication(config.authSessionSecret, userModel)
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Too many sign-in attempts. Please try again later." },
  })
  const registrationLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Too many accounts were created. Please try again later." },
  })

  router.post(
    "/register",
    requireRequestVerification,
    registrationLimiter,
    controller.register,
  )
  router.post("/login", requireRequestVerification, loginLimiter, controller.login)
  router.post(
    "/google",
    requireRequestVerification,
    loginLimiter,
    controller.googleLogin,
  )
  router.post("/logout", requireRequestVerification, controller.logout)
  router.get("/me", requireUser, controller.me)
  router.get("/dashboard", requireUser, controller.dashboard)
  router.patch("/profile", requireUser, controller.updateProfile)

  return router
}
