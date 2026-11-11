import { randomUUID } from "node:crypto"
import jwt from "jsonwebtoken"

const SESSION_LIFETIME = "1h"

export function createGuestSession(secret) {
  const sessionId = randomUUID()
  const token = jwt.sign(
    { type: "guest-upload", sub: sessionId },
    secret,
    { expiresIn: SESSION_LIFETIME, issuer: "pixora-api", audience: "pixora-upload" },
  )

  return { token, expiresIn: SESSION_LIFETIME }
}

export function verifyGuestSession(token, secret) {
  const payload = jwt.verify(token, secret, {
    issuer: "pixora-api",
    audience: "pixora-upload",
  })

  if (
    typeof payload === "string" ||
    payload.type !== "guest-upload" ||
    typeof payload.sub !== "string"
  ) {
    throw new Error("Invalid guest upload session.")
  }

  return { sessionId: payload.sub }
}
