import assert from "node:assert/strict"
import { once } from "node:events"
import test from "node:test"
import { Types } from "mongoose"
import { createApp } from "./app.js"
import { verifyGuestSession } from "./services/guestSession.service.js"
import { createMemoryProcessingUsageModel } from "./testSupport/memoryProcessingUsageModel.js"

const config = {
  frontendOrigins: ["http://localhost:5173"],
  cookieSecure: false,
  uploadSessionSecret: "test-session-secret-with-more-than-32-characters",
  authSessionSecret: "test-auth-session-secret-with-more-than-32-characters",
  googleClientId: "test-google-client-id.apps.googleusercontent.com",
  removeBgApiKey: "test-remove-bg-key",
  cloudinary: {
    cloudName: "test-cloud",
    apiKey: "test-api-key",
    apiSecret: "test-api-secret",
    uploadPreset: "pixora_signed",
  },
}

function createMemoryUserModel() {
  const users = []
  function query(value) {
    const result = Promise.resolve(value)
    result.select = () => result
    return result
  }
  return {
    async create(fields) {
      if (
        users.some(
          (user) =>
            user.email === fields.email ||
            (fields.googleSubject && user.googleSubject === fields.googleSubject),
        )
      ) {
        const error = new Error("Duplicate email.")
        error.code = 11000
        throw error
      }
      const user = {
        ...fields,
        _id: new Types.ObjectId(),
        tokenVersion: 0,
        createdAt: new Date(),
      }
      user.save = async () => user
      users.push(user)
      return user
    },
    findOne(filter) {
      const matches = (user) => {
        if (filter.email && user.email !== filter.email) return false
        if (filter.googleSubject && user.googleSubject !== filter.googleSubject) return false
        if (
          filter.$or &&
          !filter.$or.some((condition) =>
            Object.entries(condition).every(([key, value]) => user[key] === value),
          )
        ) {
          return false
        }
        return true
      }
      return query(users.find(matches) ?? null)
    },
    findById(id) {
      return query(users.find((user) => user._id.toString() === id) ?? null)
    },
    async findByIdAndUpdate(id, update) {
      const user = users.find((entry) => entry._id.toString() === id)
      if (user) {
        Object.assign(user, update.$set)
        for (const [key, increment] of Object.entries(update.$inc ?? {})) {
          user[key] = (user[key] ?? 0) + increment
        }
      }
      return user ?? null
    },
  }
}

function createMemoryImageModel() {
  const images = []
  function matches(image, query) {
    if (
      query.ownerUserId &&
      typeof query.ownerUserId !== "object" &&
      image.ownerUserId?.toString() !== query.ownerUserId.toString()
    ) {
      return false
    }
    if (query.ownerSessionId && image.ownerSessionId !== query.ownerSessionId) return false
    if (query._id && image._id !== query._id) return false
    if (
      query.ownerUserId?.$exists === false &&
      image.ownerUserId !== undefined
    ) return false
    if (query.expiresAt?.$gt && image.expiresAt <= query.expiresAt.$gt) return false
    if (query.originalFilename?.$regex) {
      const regex = new RegExp(
        query.originalFilename.$regex,
        query.originalFilename.$options,
      )
      if (!regex.test(image.originalFilename)) return false
    }
    return true
  }
  return {
    images,
    find(filter) {
      let found = images.filter((image) => matches(image, filter))
      const query = {
        sort({ createdAt }) {
          found = found.sort((left, right) => createdAt * (left.createdAt - right.createdAt))
          return query
        },
        skip(count) {
          found = found.slice(count)
          return query
        },
        limit(count) {
          found = found.slice(0, count)
          return query
        },
        lean() {
          return Promise.resolve(found)
        },
      }
      return query
    },
    findOne(filter) {
      const result = Promise.resolve(images.find((image) => matches(image, filter)) ?? null)
      result.lean = () => result
      return result
    },
    async countDocuments(filter) {
      return images.filter((image) => matches(image, filter)).length
    },
    async updateMany(filter, update) {
      const affected = images.filter((image) => matches(image, filter))
      for (const image of affected) {
        Object.assign(image, update.$set)
        for (const key of Object.keys(update.$unset ?? {})) delete image[key]
      }
      return { modifiedCount: affected.length }
    },
  }
}

test("user accounts claim guest history and cannot access another user's images", async (t) => {
  const userModel = createMemoryUserModel()
  const imageModel = createMemoryImageModel()
  const processingUsageModel = createMemoryProcessingUsageModel()
  const verifyGoogleToken = async (credential, audience) => {
    assert.equal(audience, config.googleClientId)
    if (credential === "invalid") throw new Error("Invalid Google credential.")
    if (credential === "unverified") {
      return {
        sub: "unverified-subject",
        email: "unverified@example.com",
        email_verified: false,
        name: "Unverified",
      }
    }
    if (credential === "google-only-account") {
      return {
        sub: "google-only-subject",
        email: "google-only@example.com",
        email_verified: true,
        name: "Google Only",
      }
    }
    return {
      sub: "first-user-google-subject",
      email: "FIRST@example.com",
      email_verified: true,
      name: "First User",
    }
  }
  const server = createApp(
    config,
    {
      api: {
        async resource(publicId) {
          return {
            public_id: publicId,
            secure_url: "https://res.cloudinary.com/test-cloud/image/upload/user-image.jpg",
            format: "jpg",
            bytes: 2048,
            width: 640,
            height: 480,
            type: "upload",
          }
        },
      },
      url(publicId) {
        return `https://res.cloudinary.com/test-cloud/image/upload/${publicId}`
      },
    },
    async () => Buffer.from([137, 80, 78, 71]),
    imageModel,
    undefined,
    userModel,
    processingUsageModel,
    verifyGoogleToken,
  ).listen(0, "127.0.0.1")
  await once(server, "listening")
  t.after(() => server.close())
  const baseUrl = `http://127.0.0.1:${server.address().port}/api/v1`
  const guestSessionResponse = await fetch(`${baseUrl}/uploads/session`, {
    method: "POST",
  })
  const guestCookie = guestSessionResponse.headers.get("set-cookie").split(";")[0]
  const sessionId = verifyGuestSession(
    decodeURIComponent(guestCookie.split("=")[1]),
    config.uploadSessionSecret,
  ).sessionId
  const imageId = new Types.ObjectId().toString()
  imageModel.images.push({
    _id: imageId,
    ownerSessionId: sessionId,
    originalPublicId: `guest-${sessionId}-12345678-1234-1234-1234-123456789012`,
    originalSecureUrl: "https://res.cloudinary.com/test-cloud/image/upload/user-image.jpg",
    originalFormat: "jpg",
    originalFilename: "my-image.jpg",
    status: "uploaded",
    fileSize: 2048,
    dimensions: { width: 640, height: 480 },
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  })

  const requestHeaders = {
    "Content-Type": "application/json",
    "X-Pixora-Request": "1",
  }
  const guestImagePublicIds = [
    `guest-${sessionId}-12345678-1234-1234-1234-123456789012`,
    `guest-${sessionId}-12345678-1234-1234-1234-123456789013`,
    `guest-${sessionId}-12345678-1234-1234-1234-123456789014`,
  ]
  async function processImage(publicId, authCookie) {
    return fetch(`${baseUrl}/uploads/remove-background`, {
      method: "POST",
      headers: {
        ...requestHeaders,
        Cookie: authCookie ? `${guestCookie}; ${authCookie}` : guestCookie,
      },
      body: JSON.stringify({ publicId }),
    })
  }
  assert.equal((await processImage(guestImagePublicIds[0])).status, 200)
  assert.equal((await processImage(guestImagePublicIds[1])).status, 200)
  const guestLimitResponse = await processImage(guestImagePublicIds[2])
  assert.equal(guestLimitResponse.status, 403)
  assert.equal((await guestLimitResponse.json()).code, "GUEST_PROCESSING_LIMIT")

  const firstRegistration = await fetch(`${baseUrl}/auth/register`, {
    method: "POST",
    headers: { ...requestHeaders, Cookie: guestCookie },
    body: JSON.stringify({
      displayName: "First User",
      email: "FIRST@example.com",
      password: "a-secure-password-1",
    }),
  })
  assert.equal(firstRegistration.status, 201)
  const firstUser = (await firstRegistration.json()).user
  assert.equal(firstUser.email, "first@example.com")
  const firstAuthCookie = firstRegistration.headers.get("set-cookie").split(";")[0]
  assert.match(firstRegistration.headers.get("set-cookie"), /HttpOnly/i)
  assert.match(firstRegistration.headers.get("set-cookie"), /SameSite=Lax/i)
  const firstUserResponse = await fetch(`${baseUrl}/auth/me`, {
    headers: { ...requestHeaders, Cookie: firstAuthCookie },
  })
  assert.equal(firstUserResponse.status, 200)
  assert.equal((await firstUserResponse.json()).user.id, firstUser.id)
  const refreshedUserResponse = await fetch(`${baseUrl}/auth/me`, {
    headers: { ...requestHeaders, Cookie: firstAuthCookie },
  })
  assert.equal(refreshedUserResponse.status, 200)
  assert.equal((await refreshedUserResponse.json()).user.id, firstUser.id)
  assert.equal(imageModel.images[0].ownerUserId.toString(), firstUser.id)
  assert.equal(imageModel.images[0].expiresAt, undefined)

  assert.equal(
    (await processImage(guestImagePublicIds[2], firstAuthCookie)).status,
    200,
  )

  const firstCookies = `${guestCookie}; ${firstAuthCookie}`
  const firstHistoryResponse = await fetch(`${baseUrl}/history`, {
    headers: { ...requestHeaders, Cookie: firstCookies },
  })
  assert.equal(firstHistoryResponse.status, 200)
  assert.equal((await firstHistoryResponse.json()).images.length, 1)

  const dashboardResponse = await fetch(`${baseUrl}/auth/dashboard`, {
    headers: { ...requestHeaders, Cookie: firstAuthCookie },
  })
  assert.equal(dashboardResponse.status, 200)
  assert.equal((await dashboardResponse.json()).imageCount, 1)

  const secondRegistration = await fetch(`${baseUrl}/auth/register`, {
    method: "POST",
    headers: requestHeaders,
    body: JSON.stringify({
      displayName: "Second User",
      email: "second@example.com",
      password: "another-secure-password",
    }),
  })
  assert.equal(secondRegistration.status, 201)
  const secondAuthCookie = secondRegistration.headers.get("set-cookie").split(";")[0]
  const secondHistoryResponse = await fetch(`${baseUrl}/history`, {
    headers: { ...requestHeaders, Cookie: secondAuthCookie },
  })
  assert.equal(secondHistoryResponse.status, 200)
  assert.equal((await secondHistoryResponse.json()).images.length, 0)

  const unauthorizedImage = await fetch(`${baseUrl}/history/${imageId}`, {
    headers: { ...requestHeaders, Cookie: secondAuthCookie },
  })
  assert.equal(unauthorizedImage.status, 404)
  const unauthorizedAsset = await fetch(
    `${baseUrl}/history/${imageId}/assets/original`,
    { headers: { ...requestHeaders, Cookie: secondAuthCookie } },
  )
  assert.equal(unauthorizedAsset.status, 404)
  const unauthorizedDelete = await fetch(`${baseUrl}/history/${imageId}`, {
    method: "DELETE",
    headers: { ...requestHeaders, Cookie: secondAuthCookie },
  })
  assert.equal(unauthorizedDelete.status, 404)
  assert.equal(imageModel.images.length, 1)

  const profileResponse = await fetch(`${baseUrl}/auth/profile`, {
    method: "PATCH",
    headers: { ...requestHeaders, Cookie: firstAuthCookie },
    body: JSON.stringify({ displayName: "First Account" }),
  })
  assert.equal(profileResponse.status, 200)
  assert.equal((await profileResponse.json()).user.displayName, "First Account")

  const invalidPasswordResponse = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: requestHeaders,
    body: JSON.stringify({ email: firstUser.email, password: "wrong-password" }),
  })
  assert.equal(invalidPasswordResponse.status, 401)

  const logoutResponse = await fetch(`${baseUrl}/auth/logout`, {
    method: "POST",
    headers: { ...requestHeaders, Cookie: firstAuthCookie },
    body: "{}",
  })
  assert.equal(logoutResponse.status, 204)
  assert.match(
    logoutResponse.headers.get("set-cookie"),
    /Expires=Thu, 01 Jan 1970 00:00:00 GMT/i,
  )
  const unauthenticatedDashboard = await fetch(`${baseUrl}/auth/dashboard`, {
    headers: requestHeaders,
  })
  assert.equal(unauthenticatedDashboard.status, 401)
  const unauthenticatedUser = await fetch(`${baseUrl}/auth/me`, {
    headers: requestHeaders,
  })
  assert.equal(unauthenticatedUser.status, 401)

  const revokedDashboard = await fetch(`${baseUrl}/auth/dashboard`, {
    headers: { ...requestHeaders, Cookie: firstAuthCookie },
  })
  assert.equal(revokedDashboard.status, 401)
  const revokedUser = await fetch(`${baseUrl}/auth/me`, {
    headers: { ...requestHeaders, Cookie: firstAuthCookie },
  })
  assert.equal(revokedUser.status, 401)

  const validLogin = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: requestHeaders,
    body: JSON.stringify({
      email: firstUser.email,
      password: "a-secure-password-1",
    }),
  })
  assert.equal(validLogin.status, 200)
  const loggedInCookie = validLogin.headers.get("set-cookie").split(";")[0]
  const loggedInDashboard = await fetch(`${baseUrl}/auth/dashboard`, {
    headers: { ...requestHeaders, Cookie: loggedInCookie },
  })
  assert.equal(loggedInDashboard.status, 200)

  const missingGoogleLogin = await fetch(`${baseUrl}/auth/google`, {
    method: "POST",
    headers: requestHeaders,
    body: JSON.stringify({}),
  })
  assert.equal(missingGoogleLogin.status, 400)

  const invalidGoogleLogin = await fetch(`${baseUrl}/auth/google`, {
    method: "POST",
    headers: requestHeaders,
    body: JSON.stringify({ credential: "invalid" }),
  })
  assert.equal(invalidGoogleLogin.status, 401)

  const unverifiedGoogleLogin = await fetch(`${baseUrl}/auth/google`, {
    method: "POST",
    headers: requestHeaders,
    body: JSON.stringify({ credential: "unverified" }),
  })
  assert.equal(unverifiedGoogleLogin.status, 401)

  const linkedGoogleLogin = await fetch(`${baseUrl}/auth/google`, {
    method: "POST",
    headers: requestHeaders,
    body: JSON.stringify({ credential: "first-user" }),
  })
  assert.equal(linkedGoogleLogin.status, 200)
  const linkedGoogleUser = (await linkedGoogleLogin.json()).user
  assert.equal(linkedGoogleUser.id, firstUser.id)
  const googleAuthCookie = linkedGoogleLogin.headers.get("set-cookie").split(";")[0]
  assert.match(linkedGoogleLogin.headers.get("set-cookie"), /HttpOnly/i)
  assert.match(linkedGoogleLogin.headers.get("set-cookie"), /SameSite=Lax/i)
  const googleCurrentUser = await fetch(`${baseUrl}/auth/me`, {
    headers: { ...requestHeaders, Cookie: googleAuthCookie },
  })
  assert.equal(googleCurrentUser.status, 200)
  assert.equal((await googleCurrentUser.json()).user.id, firstUser.id)

  const googleOnlyLogin = await fetch(`${baseUrl}/auth/google`, {
    method: "POST",
    headers: requestHeaders,
    body: JSON.stringify({ credential: "google-only-account" }),
  })
  assert.equal(googleOnlyLogin.status, 200)
  const googleOnlyUser = (await googleOnlyLogin.json()).user
  const googleOnlyPasswordLogin = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: requestHeaders,
    body: JSON.stringify({
      email: googleOnlyUser.email,
      password: "any-password",
    }),
  })
  assert.equal(googleOnlyPasswordLogin.status, 401)
})
