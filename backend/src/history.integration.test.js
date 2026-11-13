import assert from "node:assert/strict"
import { once } from "node:events"
import test from "node:test"
import { Types } from "mongoose"
import { createApp } from "./app.js"

const config = {
  frontendOrigins: ["http://localhost:5173"],
  cookieSecure: false,
  uploadSessionSecret: "test-session-secret-with-more-than-32-characters",
  authSessionSecret: "test-auth-session-secret-with-more-than-32-characters",
  removeBgApiKey: "test-remove-bg-key",
  cloudinary: {
    cloudName: "test-cloud",
    apiKey: "test-api-key",
    apiSecret: "test-api-secret",
    uploadPreset: "pixora_signed",
  },
}

function createMemoryImageModel() {
  const images = []
  function matches(image, query) {
    if (query.ownerSessionId && image.ownerSessionId !== query.ownerSessionId) return false
    if (query._id && image._id !== query._id) return false
    if (query.status && image.status !== query.status) return false
    if (
      query.processedPublicId?.$ne === null &&
      !image.processedPublicId
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
    find(query) {
      let result = images.filter((image) => matches(image, query))
      const chain = {
        sort({ createdAt }) {
          result = result.sort((left, right) =>
            createdAt * (left.createdAt - right.createdAt),
          )
          return chain
        },
        skip(count) {
          result = result.slice(count)
          return chain
        },
        limit(count) {
          result = result.slice(0, count)
          return chain
        },
        lean() {
          return Promise.resolve(result)
        },
      }
      return chain
    },
    findOne(query) {
      const result = Promise.resolve(images.find((image) => matches(image, query)) ?? null)
      result.lean = () => result
      return result
    },
    async countDocuments(query) {
      return images.filter((image) => matches(image, query)).length
    },
    async create(fields) {
      const image = {
        ...fields,
        _id: new Types.ObjectId().toString(),
        createdAt: new Date(),
        updatedAt: new Date(),
        backgroundSettings: {
          backgroundMode: "transparent",
          backgroundColor: "#ffffff",
          presetId: "warm",
          positionX: 50,
          positionY: 50,
          scale: 100,
          exportFormat: "png",
        },
        toObject() {
          return { ...this, toObject: undefined, save: undefined }
        },
        async save() {
          this.updatedAt = new Date()
          return this
        },
      }
      images.push(image)
      return image
    },
    async findOneAndUpdate(query, update) {
      const image = images.find((entry) => matches(entry, query))
      if (!image) return null
      Object.assign(image, update.$set)
      return image
    },
    async deleteOne(query) {
      const index = images.findIndex((image) => matches(image, query))
      if (index >= 0) images.splice(index, 1)
      return { deletedCount: index >= 0 ? 1 : 0 }
    },
  }
}

test("processed uploads appear in guest history with the correct reopen assets", async (t) => {
  const assets = new Map()
  const imageModel = createMemoryImageModel()
  const fetchedAssets = []
  const cloudinaryClient = {
    api: {
      async resource(publicId) {
        const asset = assets.get(publicId)
        if (!asset) throw new Error("Cloudinary asset was not found.")
        return asset
      },
    },
    url(publicId, options) {
      return `https://res.cloudinary.test/${options.width ? "thumbnail" : "download"}/${publicId}`
    },
    uploader: {
      async destroy(publicId) {
        assets.delete(publicId)
        return { result: "ok" }
      },
    },
  }
  const server = createApp(
    config,
    cloudinaryClient,
    async () => Buffer.from([137, 80, 78, 71]),
    imageModel,
    async (url) => {
      fetchedAssets.push(url)
      return {
        data: Buffer.from(url.endsWith("original.jpg") ? "original-bytes" : "processed-bytes"),
      }
    },
  ).listen(0, "127.0.0.1")
  await once(server, "listening")
  t.after(() => server.close())
  const baseUrl = `http://127.0.0.1:${server.address().port}/api/v1`
  const sessionResponse = await fetch(`${baseUrl}/uploads/session`, { method: "POST" })
  const cookie = sessionResponse.headers.get("set-cookie").split(";")[0]
  const headers = {
    Cookie: cookie,
    "X-Pixora-Guest-Request": "1",
    "Content-Type": "application/json",
  }

  async function createUploadedAsset(format, filename) {
    const response = await fetch(`${baseUrl}/uploads/signature`, {
      method: "POST",
      headers,
      body: "{}",
    })
    const { params } = await response.json()
    const publicId = params.public_id
    assets.set(publicId, {
      public_id: publicId,
      secure_url: `https://res.cloudinary.com/test-cloud/image/upload/${filename}`,
      format,
      bytes: 2048,
      width: 1200,
      height: 800,
      type: "upload",
    })
    return publicId
  }

  const originalPublicId = await createUploadedAsset("jpg", "original.jpg")
  const createResponse = await fetch(`${baseUrl}/history`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      originalPublicId,
      originalFilename: "portrait.jpg",
    }),
  })
  assert.equal(createResponse.status, 201)
  const created = (await createResponse.json()).image
  assert.equal(
    created.originalSecureUrl,
    "https://res.cloudinary.com/test-cloud/image/upload/original.jpg",
  )
  assert.equal(created.status, "uploaded")

  const processedPublicId = await createUploadedAsset("png", "cutout.png")
  const processResponse = await fetch(
    `${baseUrl}/history/${created._id}/processed`,
    {
      method: "PATCH",
      headers,
      body: JSON.stringify({ processedPublicId }),
    },
  )
  assert.equal(processResponse.status, 200)

  const settingsResponse = await fetch(
    `${baseUrl}/history/${created._id}/settings`,
    {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        backgroundSettings: {
          backgroundMode: "color",
          backgroundColor: "#123456",
          presetId: "warm",
          positionX: 40,
          positionY: 60,
          scale: 125,
          exportFormat: "png",
        },
      }),
    },
  )
  assert.equal(settingsResponse.status, 200)
  assert.equal((await settingsResponse.json()).image.status, "edited")

  const listResponse = await fetch(
    `${baseUrl}/history?filter=edited&search=portrait&sort=newest`,
    { headers },
  )
  assert.equal(listResponse.status, 200)
  const listed = (await listResponse.json()).images
  assert.equal(listed.length, 1)
  assert.equal(
    listed[0].originalSecureUrl,
    "https://res.cloudinary.com/test-cloud/image/upload/original.jpg",
  )
  assert.equal(
    listed[0].processedSecureUrl,
    "https://res.cloudinary.com/test-cloud/image/upload/cutout.png",
  )
  assert.match(listed[0].originalThumbnailUrl, /thumbnail/)
  assert.match(listed[0].processedThumbnailUrl, /thumbnail/)

  const reopenResponse = await fetch(`${baseUrl}/history/${created._id}`, { headers })
  const reopened = (await reopenResponse.json()).image
  assert.equal(reopened.originalPublicId, originalPublicId)
  assert.equal(reopened.processedPublicId, processedPublicId)
  assert.equal(reopened.backgroundSettings.backgroundColor, "#123456")
  assert.equal(
    reopened.originalSecureUrl,
    "https://res.cloudinary.com/test-cloud/image/upload/original.jpg",
  )
  assert.equal(
    reopened.processedSecureUrl,
    "https://res.cloudinary.com/test-cloud/image/upload/cutout.png",
  )
  const originalAssetResponse = await fetch(
    `${baseUrl}/history/${created._id}/assets/original`,
    { headers },
  )
  const processedAssetResponse = await fetch(
    `${baseUrl}/history/${created._id}/assets/processed`,
    { headers },
  )
  assert.equal(originalAssetResponse.headers.get("content-type"), "image/jpeg")
  assert.equal(processedAssetResponse.headers.get("content-type"), "image/png")
  assert.equal(await originalAssetResponse.text(), "original-bytes")
  assert.equal(await processedAssetResponse.text(), "processed-bytes")
  assert.deepEqual(fetchedAssets, [
    "https://res.cloudinary.com/test-cloud/image/upload/original.jpg",
    "https://res.cloudinary.com/test-cloud/image/upload/cutout.png",
  ])

  const otherSessionResponse = await fetch(`${baseUrl}/uploads/session`, {
    method: "POST",
  })
  const otherHeaders = {
    ...headers,
    Cookie: otherSessionResponse.headers.get("set-cookie").split(";")[0],
  }
  const unauthorizedReopen = await fetch(`${baseUrl}/history/${created._id}`, {
    headers: otherHeaders,
  })
  assert.equal(unauthorizedReopen.status, 404)

  const deleteResponse = await fetch(`${baseUrl}/history/${created._id}`, {
    method: "DELETE",
    headers,
  })
  assert.equal(deleteResponse.status, 204)
  assert.equal(assets.has(originalPublicId), false)
  assert.equal(assets.has(processedPublicId), false)
})
