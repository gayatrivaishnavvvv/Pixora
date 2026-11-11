import { verifyGuestSession } from "../services/guestSession.service.js"

export function requireGuestSession(secret) {
  return (req, res, next) => {
    const authorization = req.get("authorization")
    const match = authorization?.match(/^Bearer\s+(.+)$/i)

    if (!match) {
      return res.status(401).json({ error: "A guest upload session is required." })
    }

    try {
      req.guestSession = verifyGuestSession(match[1], secret)
      return next()
    } catch {
      return res
        .status(401)
        .json({ error: "The guest upload session is invalid or expired." })
    }
  }
}
