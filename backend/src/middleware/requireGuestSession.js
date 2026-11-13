import {
  GUEST_SESSION_COOKIE,
  verifyGuestSession,
} from "../services/guestSession.service.js"

export function requireGuestSession(secret) {
  return (req, res, next) => {
    const cookieHeader = req.get("cookie") ?? ""
    const cookie = cookieHeader
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${GUEST_SESSION_COOKIE}=`))
    const token = cookie?.slice(GUEST_SESSION_COOKIE.length + 1)
    if (!token) {
      return res.status(401).json({ error: "A guest upload session is required." })
    }
    if (
      req.get("x-pixora-request") !== "1" &&
      req.get("x-pixora-guest-request") !== "1"
    ) {
      return res.status(403).json({ error: "The guest request could not be verified." })
    }

    try {
      req.guestSession = verifyGuestSession(decodeURIComponent(token), secret)
      return next()
    } catch {
      return res
        .status(401)
        .json({ error: "The guest upload session is invalid or expired." })
    }
  }
}
