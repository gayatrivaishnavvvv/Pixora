import assert from "node:assert/strict"
import test from "node:test"
import { removeImageBackground } from "./backgroundRemoval.service.js"

test("remove.bg receives the verified image URL and returns a PNG", async () => {
  let request
  const image = Buffer.from([137, 80, 78, 71])
  const result = await removeImageBackground({
    imageUrl: "https://res.cloudinary.com/test-cloud/image/upload/original.png",
    apiKey: "test-remove-bg-key",
    fetchImpl: async (url, options) => {
      request = { url, options }
      return new Response(image, {
        headers: { "Content-Type": "image/png" },
      })
    },
  })

  assert.equal(request.url, "https://api.remove.bg/v1.0/removebg")
  assert.equal(request.options.method, "POST")
  assert.equal(request.options.headers["X-Api-Key"], "test-remove-bg-key")
  assert.equal(
    request.options.body.get("image_url"),
    "https://res.cloudinary.com/test-cloud/image/upload/original.png",
  )
  assert.equal(request.options.body.get("size"), "auto")
  assert.equal(request.options.body.get("format"), "png")
  assert.deepEqual(result, image)
})

test("background removal reports missing API configuration", async () => {
  await assert.rejects(
    removeImageBackground({
      imageUrl: "https://res.cloudinary.com/test-cloud/image/upload/original.png",
      apiKey: "",
    }),
    {
      statusCode: 503,
      message: /REMOVE_BG_API_KEY/,
    },
  )
})

test("background removal reports provider quota failures clearly", async () => {
  await assert.rejects(
    removeImageBackground({
      imageUrl: "https://res.cloudinary.com/test-cloud/image/upload/original.png",
      apiKey: "test-remove-bg-key",
      fetchImpl: async () => new Response(null, { status: 402 }),
    }),
    {
      statusCode: 502,
      message: /quota or billing limit/,
    },
  )
})
