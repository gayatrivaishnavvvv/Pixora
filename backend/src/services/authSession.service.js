import jwt from "jsonwebtoken"

export const AUTH_SESSION_COOKIE = "pixora_auth"
export const AUTH_SESSION_LIFETIME = "7d"
export const AUTH_SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

export function createAuthSession(userId, secret, tokenVersion = 0) {
  const token = jwt.sign(
    { type: "user-session", tokenVersion },
    secret,
    {
      subject: userId,
      expiresIn: AUTH_SESSION_LIFETIME,
      issuer: "pixora-api",
      audience: "pixora-user",
    },
  )
  return { token, expiresIn: AUTH_SESSION_LIFETIME }
}

export function verifyAuthSession(token, secret) {
  const payload = jwt.verify(token, secret, {
    issuer: "pixora-api",
    audience: "pixora-user",
  })
  if (
    typeof payload === "string" ||
    payload.type !== "user-session" ||
    typeof payload.sub !== "string" ||
    !Number.isInteger(payload.tokenVersion)
  ) {
    throw new Error("Invalid user session.")
  }
  return { userId: payload.sub, tokenVersion: payload.tokenVersion }
}
