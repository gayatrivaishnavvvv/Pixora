import assert from "node:assert/strict"
import test from "node:test"
import { v2 as cloudinary } from "cloudinary"
import {
  createSignedUpload,
  deleteOwnedGuestImage,
  getOwnedGuestImage,
} from "./cloudinary.service.js"

test("signed uploads use a server-controlled guest folder and restrictions", () => {
  const upload = createSignedUpload({
    sessionId: "guest-123",
    cloudName: "test-cloud",
    apiKey: "test-api-key",
    apiSecret: "test-api-secret",
    uploadPreset: "pixora_signed",
  })

  assert.equal(upload.params.folder, "pixora/guest")
  assert.match(upload.params.public_id, /^guest-guest-123-[0-9a-f-]{36}$/)
  assert.equal(upload.params.overwrite, false)
  assert.equal(upload.params.unique_filename, false)
  assert.equal(upload.params.upload_preset, "pixora_signed")
  assert.deepEqual(upload.allowedFormats, ["jpg", "png", "webp"])
  assert.equal(upload.maxFileSize, 10 * 1024 * 1024)
  assert.equal(
    upload.signature,
    cloudinary.utils.api_sign_request(upload.params, "test-api-secret"),
  )
})

test("guest sessions cannot verify assets outside their own folder", async () => {
  await assert.rejects(
    getOwnedGuestImage({
      client: {},
      sessionId: "guest-123",
      publicId: "guest-someone-else-12345678-1234-1234-1234-123456789abc",
    }),
    { statusCode: 403 },
  )

  await assert.rejects(
    getOwnedGuestImage({
      client: {},
      sessionId: "guest-123",
      publicId: "pixora/other/guest-guest-123-12345678-1234-1234-1234-123456789abc",
    }),
    { statusCode: 403 },
  )
})

test("guest image deletion verifies ownership before calling Cloudinary", async () => {
  let deletedPublicId
  const client = {
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
      async destroy(publicId, options) {
        deletedPublicId = publicId
        assert.deepEqual(options, { resource_type: "image", invalidate: true })
        return { result: "ok" }
      },
    },
  }

  await deleteOwnedGuestImage({
    client,
    sessionId: "guest-123",
    publicId: "guest-guest-123-12345678-1234-1234-1234-123456789abc",
  })

  assert.equal(
    deletedPublicId,
    "guest-guest-123-12345678-1234-1234-1234-123456789abc",
  )
})
