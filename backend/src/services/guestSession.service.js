import { randomUUID } from "node:crypto"
import jwt from "jsonwebtoken"

export const GUEST_SESSION_LIFETIME = "30d"
export const GUEST_SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000
export const GUEST_SESSION_COOKIE = "pixora_guest"

export function createGuestSession(secret) {
  const sessionId = randomUUID()
  const token = jwt.sign(
    { type: "guest-upload", sub: sessionId },
    secret,
    {
      expiresIn: GUEST_SESSION_LIFETIME,
      issuer: "pixora-api",
      audience: "pixora-upload",
    },
  )

  return { token, expiresIn: GUEST_SESSION_LIFETIME }
}

export function verifyGuestSession(token, secret) {
  const payload = jwt.verify(token, secret, {
    issuer: "pixora-api",
    audience: "pixora-upload",
  })

  if (
    typeof payload === "string" ||
    payload.type !== "guest-upload" ||
    typeof payload.sub !== "string" ||
    typeof payload.exp !== "number"
  ) {
    throw new Error("Invalid guest upload session.")
  }

  return { sessionId: payload.sub, expiresAt: new Date(payload.exp * 1000) }
}
