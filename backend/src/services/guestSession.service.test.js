import assert from "node:assert/strict"
import test from "node:test"
import jwt from "jsonwebtoken"
import { createGuestSession, verifyGuestSession } from "./guestSession.service.js"

const secret = "test-session-secret-with-more-than-32-characters"

test("guest upload sessions create a verifiable scoped identity", () => {
  const session = createGuestSession(secret)
  const verified = verifyGuestSession(session.token, secret)

  assert.equal(session.expiresIn, "30d")
  assert.match(verified.sessionId, /^[0-9a-f-]{36}$/)
})

test("guest upload sessions reject tokens signed with another secret", () => {
  const session = createGuestSession(secret)

  assert.throws(() => verifyGuestSession(session.token, "different-secret"), jwt.JsonWebTokenError)
})
