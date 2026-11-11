const REMOVE_BG_ENDPOINT = "https://api.remove.bg/v1.0/removebg"

export async function removeImageBackground({
  imageUrl,
  apiKey,
  fetchImpl = fetch,
}) {
  if (!apiKey) {
    const error = new Error(
      "Background removal is not configured. Add REMOVE_BG_API_KEY to backend/.env and restart the API.",
    )
    error.statusCode = 503
    throw error
  }

  const formData = new FormData()
  formData.append("image_url", imageUrl)
  formData.append("size", "auto")
  formData.append("format", "png")

  let response
  try {
    response = await fetchImpl(REMOVE_BG_ENDPOINT, {
      method: "POST",
      headers: { "X-Api-Key": apiKey },
      body: formData,
      signal: AbortSignal.timeout(60_000),
    })
  } catch (cause) {
    const error = new Error(
      cause.name === "TimeoutError"
        ? "The background-removal provider timed out. Try again."
        : "Could not connect to the background-removal provider. Try again later.",
      { cause },
    )
    error.statusCode = cause.name === "TimeoutError" ? 504 : 502
    throw error
  }

  if (!response.ok) {
    const error = new Error(
      response.status === 402
        ? "The background-removal provider quota or billing limit was reached."
        : response.status === 429
          ? "The background-removal provider is rate-limiting requests. Try again later."
          : response.status === 400
            ? "The provider could not process this image. Try a different image."
            : "The background-removal provider rejected the request. Check its API key and account status.",
    )
    error.statusCode = response.status === 400 ? 422 : response.status === 429 ? 429 : 502
    throw error
  }

  const contentType = response.headers.get("content-type")?.split(";")[0]
  if (contentType !== "image/png") {
    const error = new Error("The background-removal provider returned an invalid image.")
    error.statusCode = 502
    throw error
  }

  const image = Buffer.from(await response.arrayBuffer())
  if (image.length === 0) {
    const error = new Error("The background-removal provider returned an empty image.")
    error.statusCode = 502
    throw error
  }

  return image
}
