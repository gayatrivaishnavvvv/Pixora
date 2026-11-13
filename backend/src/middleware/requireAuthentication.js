import {
  AUTH_SESSION_COOKIE,
  verifyAuthSession,
} from "../services/authSession.service.js"
import { GUEST_SESSION_COOKIE, verifyGuestSession } from "../services/guestSession.service.js"

function getCookieToken(req, cookieName) {
  const cookie = (req.get("cookie") ?? "")
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`))
  return cookie?.slice(cookieName.length + 1)
}

function requireRequestHeader(req, res) {
  if (
    req.get("x-pixora-request") !== "1" &&
    req.get("x-pixora-guest-request") !== "1"
  ) {
    res.status(403).json({ error: "The request could not be verified." })
    return false
  }
  return true
}

export function requireAuthentication(secret, userModel) {
  return async (req, res, next) => {
    const encodedToken = getCookieToken(req, AUTH_SESSION_COOKIE)
    if (!encodedToken) {
      return res.status(401).json({ error: "Authentication is required." })
    }
    if (!requireRequestHeader(req, res)) return

    let userId
    let tokenVersion
    try {
      const session = verifyAuthSession(decodeURIComponent(encodedToken), secret)
      userId = session.userId
      tokenVersion = session.tokenVersion
    } catch {
      return res
        .status(401)
        .json({ error: "The user session is invalid or expired." })
    }
    const user = await userModel.findById(userId).select("_id tokenVersion")
    if (!user || user.tokenVersion !== tokenVersion) {
      return res.status(401).json({ error: "The user session is invalid or expired." })
    }
    req.authUserId = user._id.toString()
    return next()
  }
}

export function optionalAuthentication(secret, userModel) {
  const requireUser = requireAuthentication(secret, userModel)
  return (req, res, next) => {
    if (!getCookieToken(req, AUTH_SESSION_COOKIE)) return next()
    return requireUser(req, res, next)
  }
}

export function requireHistoryOwner(authSecret, guestSecret, userModel) {
  const requireUser = requireAuthentication(authSecret, userModel)
  return async (req, res, next) => {
    const authToken = getCookieToken(req, AUTH_SESSION_COOKIE)
    if (authToken) {
      return requireUser(req, res, async (error) => {
        if (error) return next(error)
        if (res.headersSent) return
        req.historyOwner = { userId: req.authUserId }
        const guestToken = getCookieToken(req, GUEST_SESSION_COOKIE)
        if (guestToken) {
          try {
            req.guestSession = verifyGuestSession(
              decodeURIComponent(guestToken),
              guestSecret,
            )
          } catch {
            req.guestSession = undefined
          }
        }
        return next()
      })
    }

    const guestToken = getCookieToken(req, GUEST_SESSION_COOKIE)
    if (!guestToken) {
      return res.status(401).json({ error: "A guest or authenticated session is required." })
    }
    if (!requireRequestHeader(req, res)) return
    try {
      req.guestSession = verifyGuestSession(
        decodeURIComponent(guestToken),
        guestSecret,
      )
      req.historyOwner = { sessionId: req.guestSession.sessionId }
      return next()
    } catch {
      return res
        .status(401)
        .json({ error: "The guest session is invalid or expired." })
    }
  }
}

export function requireRequestVerification(req, res, next) {
  return requireRequestHeader(req, res) ? next() : undefined
}
