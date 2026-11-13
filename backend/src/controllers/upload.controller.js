import {
  createGuestSession,
  GUEST_SESSION_COOKIE,
  GUEST_SESSION_MAX_AGE_MS,
  verifyGuestSession,
} from "../services/guestSession.service.js"
import {
  createSignedUpload,
  deleteOwnedGuestImage,
  getOwnedGuestImage,
} from "../services/cloudinary.service.js"
import {
  completeGuestImageProcessing,
  releaseGuestImageProcessing,
  reserveGuestImageProcessing,
} from "../services/guestProcessingUsage.service.js"

function getPublicIdFromBody(body) {
  return typeof body?.publicId === "string" ? body.publicId.trim() : ""
}

export function createUploadController(
  config,
  cloudinaryClient,
  removeBackgroundImage,
  processingUsageModel,
) {
  return {
    createSession(req, res) {
      const currentCookie = req.get("cookie")
        ?.split(";")
        .map((part) => part.trim())
        .find((part) => part.startsWith(`${GUEST_SESSION_COOKIE}=`))
      if (currentCookie) {
        try {
          const currentSession = verifyGuestSession(
            decodeURIComponent(currentCookie.slice(GUEST_SESSION_COOKIE.length + 1)),
            config.uploadSessionSecret,
          )
          return res.json({
            expiresAt: currentSession.expiresAt,
            expiresIn: "30d",
          })
        } catch {
          res.clearCookie(GUEST_SESSION_COOKIE, {
            httpOnly: true,
            sameSite: config.cookieSameSite ?? "lax",
            secure: Boolean(config.cookieSecure),
            path: "/api/v1",
          })
        }
      }

      const session = createGuestSession(config.uploadSessionSecret)
      res.cookie(GUEST_SESSION_COOKIE, session.token, {
        httpOnly: true,
        secure: Boolean(config.cookieSecure),
        sameSite: config.cookieSameSite ?? "lax",
        path: "/api/v1",
        maxAge: GUEST_SESSION_MAX_AGE_MS,
      })
      res.status(201).json({ expiresIn: session.expiresIn })
    },

    createSignature(req, res) {
      res.json(
        createSignedUpload({
          sessionId: req.guestSession.sessionId,
          ...config.cloudinary,
        }),
      )
    },

    async verifyUpload(req, res) {
      const publicId = getPublicIdFromBody(req.body)
      if (!publicId || publicId.length > 255) {
        return res.status(400).json({ error: "A valid publicId is required." })
      }

      const asset = await getOwnedGuestImage({
        client: cloudinaryClient,
        sessionId: req.guestSession.sessionId,
        publicId,
      })
      res.json({ asset })
    },

    async deleteUpload(req, res) {
      const publicId = getPublicIdFromBody(req.body)
      if (!publicId || publicId.length > 255) {
        return res.status(400).json({ error: "A valid publicId is required." })
      }

      await deleteOwnedGuestImage({
        client: cloudinaryClient,
        sessionId: req.guestSession.sessionId,
        publicId,
      })
      res.status(204).end()
    },

    async removeBackground(req, res) {
      const publicId = getPublicIdFromBody(req.body)
      if (!publicId || publicId.length > 255) {
        return res.status(400).json({ error: "A valid publicId is required." })
      }

      const asset = await getOwnedGuestImage({
        client: cloudinaryClient,
        sessionId: req.guestSession.sessionId,
        publicId,
      })
      const reservationId = req.authUserId
        ? null
        : await reserveGuestImageProcessing(processingUsageModel, {
            sessionId: req.guestSession.sessionId,
            originalPublicId: asset.publicId,
            expiresAt: req.guestSession.expiresAt,
          })
      let result
      try {
        result = await removeBackgroundImage({
          imageUrl: asset.secureUrl,
          apiKey: config.removeBgApiKey,
        })
      } catch (error) {
        if (reservationId) {
          await releaseGuestImageProcessing(processingUsageModel, {
            sessionId: req.guestSession.sessionId,
            originalPublicId: asset.publicId,
            reservationId,
          })
        }
        throw error
      }
      if (reservationId) {
        await completeGuestImageProcessing(processingUsageModel, {
          sessionId: req.guestSession.sessionId,
          originalPublicId: asset.publicId,
          reservationId,
        })
      }

      res.set({
        "Cache-Control": "no-store",
        "Content-Type": "image/png",
        "X-Content-Type-Options": "nosniff",
      })
      res.send(result)
    },
  }
}
