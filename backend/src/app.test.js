import assert from "node:assert/strict"
import { once } from "node:events"
import test from "node:test"
import { createApp } from "./app.js"

test("guest upload API issues scoped signatures and verifies assets", async (t) => {
  const config = {
    frontendOrigins: ["http://localhost:5173"],
    uploadSessionSecret: "test-session-secret-with-more-than-32-characters",
    removeBgApiKey: "test-remove-bg-key",
    cloudinary: {
      cloudName: "test-cloud",
      apiKey: "test-api-key",
      apiSecret: "test-api-secret",
      uploadPreset: "pixora_signed",
    },
  }
  const cloudinaryClient = {
    api: {
      async resource(publicId) {
        return {
          public_id: publicId,
          secure_url: "https://res.cloudinary.com/test-cloud/image/upload/test.png",
          format: "png",
          bytes: 1024,
          width: 10,
          height: 10,
          type: "upload",
        }
      },
    },
    uploader: {
      async destroy() {
        return { result: "ok" }
      },
    },
  }

  const server = createApp(
    config,
    cloudinaryClient,
    async ({ imageUrl, apiKey }) => {
      assert.equal(
        imageUrl,
        "https://res.cloudinary.com/test-cloud/image/upload/test.png",
      )
      assert.equal(apiKey, "test-remove-bg-key")
      return Buffer.from([137, 80, 78, 71])
    },
  ).listen(0, "127.0.0.1")
  await once(server, "listening")
  t.after(() => server.close())
  const baseUrl = `http://127.0.0.1:${server.address().port}/api/v1/uploads`

  const unauthorized = await fetch(`${baseUrl}/signature`, { method: "POST" })
  assert.equal(unauthorized.status, 401)

  const sessionResponse = await fetch(`${baseUrl}/session`, { method: "POST" })
  assert.equal(sessionResponse.status, 201)
  const session = await sessionResponse.json()

  const signatureResponse = await fetch(`${baseUrl}/signature`, {
    method: "POST",
    headers: { Authorization: `Bearer ${session.token}` },
  })
  assert.equal(signatureResponse.status, 200)
  const signedUpload = await signatureResponse.json()
  assert.equal(signedUpload.params.folder, "pixora/guest")
  assert.match(signedUpload.params.public_id, /^guest-[0-9a-f-]{36}-[0-9a-f-]{36}$/)
  assert.ok(signedUpload.signature)

  const verifyResponse = await fetch(`${baseUrl}/verify`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ publicId: signedUpload.params.public_id }),
  })
  assert.equal(verifyResponse.status, 200)
  const verified = await verifyResponse.json()
  assert.equal(verified.asset.publicId, signedUpload.params.public_id)

  const unauthorizedProcessing = await fetch(
    `${baseUrl}/remove-background`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicId: signedUpload.params.public_id }),
    },
  )
  assert.equal(unauthorizedProcessing.status, 401)

  const processingResponse = await fetch(`${baseUrl}/remove-background`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ publicId: signedUpload.params.public_id }),
  })
  assert.equal(processingResponse.status, 200)
  assert.equal(processingResponse.headers.get("content-type"), "image/png")
  assert.deepEqual(
    Buffer.from(await processingResponse.arrayBuffer()),
    Buffer.from([137, 80, 78, 71]),
  )

  const deleteResponse = await fetch(`${baseUrl}/asset`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${session.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ publicId: signedUpload.params.public_id }),
  })
  assert.equal(deleteResponse.status, 204)
})

test("API exposes safe background-provider errors to the workspace", async (t) => {
  const config = {
    frontendOrigins: ["http://localhost:5173"],
    uploadSessionSecret: "test-session-secret-with-more-than-32-characters",
    removeBgApiKey: "test-remove-bg-key",
    cloudinary: {
      cloudName: "test-cloud",
      apiKey: "test-api-key",
      apiSecret: "test-api-secret",
      uploadPreset: "pixora_signed",
    },
  }
  const cloudinaryClient = {
    api: {
      async resource(publicId) {
        return {
          public_id: publicId,
          secure_url: "https://res.cloudinary.com/test-cloud/image/upload/test.png",
          format: "png",
          bytes: 1024,
          width: 10,
          height: 10,
          type: "upload",
        }
      },
    },
  }
  const server = createApp(config, cloudinaryClient, async () => {
    const error = new Error(
      "The background-removal provider quota or billing limit was reached.",
    )
    error.statusCode = 502
    throw error
  }).listen(0, "127.0.0.1")
  await once(server, "listening")
  t.after(() => server.close())
  const baseUrl = `http://127.0.0.1:${server.address().port}/api/v1/uploads`

  const sessionResponse = await fetch(`${baseUrl}/session`, { method: "POST" })
  const session = await sessionResponse.json()
  const signatureResponse = await fetch(`${baseUrl}/signature`, {
    method: "POST",
    headers: { Authorization: "Bearer " + session.token },
  })
  const signedUpload = await signatureResponse.json()

  const response = await fetch(`${baseUrl}/remove-background`, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + session.token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ publicId: signedUpload.params.public_id }),
  })

  assert.equal(response.status, 502)
  assert.deepEqual(await response.json(), {
    error: "The background-removal provider quota or billing limit was reached.",
  })
})
