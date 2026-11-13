import axios from "axios"
import { API_BASE_URL } from "./apiConfig"

const guestRequest = {
  withCredentials: true,
  headers: { "X-Pixora-Request": "1" },
}

let guestSessionReady = false

async function ensureGuestSession() {
  if (guestSessionReady) return
  await axios.post(`${API_BASE_URL}/uploads/session`, {}, { withCredentials: true })
  guestSessionReady = true
}

async function uploadGuestAsset(file, onProgress) {
  const { data: signedUpload } = await axios.post(
    `${API_BASE_URL}/uploads/signature`,
    {},
    guestRequest,
  )

  const formData = new FormData()
  formData.append("file", file)
  formData.append("api_key", signedUpload.apiKey)
  formData.append("signature", signedUpload.signature)
  for (const [key, value] of Object.entries(signedUpload.params)) {
    formData.append(key, String(value))
  }

  const { data: cloudinaryAsset } = await axios.post(
    signedUpload.uploadUrl,
    formData,
    {
      onUploadProgress: (event) => {
        if (event.total && onProgress) {
          onProgress(Math.round((event.loaded / event.total) * 100))
        }
      },
    },
  )

  const { data: verified } = await axios.post(
    `${API_BASE_URL}/uploads/verify`,
    { publicId: cloudinaryAsset.public_id },
    guestRequest,
  )
  return verified.asset
}

export async function uploadOriginalImage(file, onProgress) {
  await ensureGuestSession()
  const asset = await uploadGuestAsset(file, onProgress)
  return { asset }
}

export async function deleteGuestUpload(publicId) {
  await axios.delete(`${API_BASE_URL}/uploads/asset`, {
    data: { publicId },
    ...guestRequest,
  })
}

export async function processBackgroundRemoval(publicId) {
  try {
    const { data } = await axios.post(
      `${API_BASE_URL}/uploads/remove-background`,
      { publicId },
      { ...guestRequest, responseType: "blob" },
    )
    return data
  } catch (error) {
    const responseData = error.response?.data
    if (
      responseData instanceof Blob &&
      responseData.type.includes("application/json")
    ) {
      const payload = JSON.parse(await responseData.text())
      const requestError = new Error(payload.error ?? "Background removal failed.")
      requestError.code = payload.code
      requestError.status = error.response.status
      throw requestError
    }
    throw error
  }
}

export async function createHistoryImage(publicId, originalFilename) {
  const { data } = await axios.post(
    `${API_BASE_URL}/history`,
    { originalPublicId: publicId, originalFilename },
    guestRequest,
  )
  return data.image
}

export async function uploadProcessedImage(blob, filename, onProgress) {
  const file = new File([blob], filename, { type: "image/png" })
  return uploadGuestAsset(file, onProgress)
}

export async function completeHistoryProcessing(historyId, processedPublicId) {
  const { data } = await axios.patch(
    `${API_BASE_URL}/history/${encodeURIComponent(historyId)}/processed`,
    { processedPublicId },
    guestRequest,
  )
  return data.image
}

export async function listHistoryImages({
  search = "",
  filter = "all",
  sort = "newest",
  page = 1,
  limit = 12,
}) {
  await ensureGuestSession()
  const { data } = await axios.get(`${API_BASE_URL}/history`, {
    ...guestRequest,
    params: { search, filter, sort, page, limit },
  })
  return data
}

export async function getHistoryImage(historyId) {
  await ensureGuestSession()
  const { data } = await axios.get(
    `${API_BASE_URL}/history/${encodeURIComponent(historyId)}`,
    guestRequest,
  )
  return data.image
}

export async function getHistoryImageAssets(historyId, includeProcessed = true) {
  const originalRequest = axios.get(
    `${API_BASE_URL}/history/${encodeURIComponent(historyId)}/assets/original`,
    { ...guestRequest, responseType: "blob" },
  )
  if (!includeProcessed) {
    const original = await originalRequest
    return { original: original.data, processed: null }
  }
  const [original, processed] = await Promise.all([
    originalRequest,
    axios.get(
      `${API_BASE_URL}/history/${encodeURIComponent(historyId)}/assets/processed`,
      { ...guestRequest, responseType: "blob" },
    ),
  ])
  return { original: original.data, processed: processed.data }
}

export async function saveHistorySettings(historyId, backgroundSettings) {
  const { data } = await axios.patch(
    `${API_BASE_URL}/history/${encodeURIComponent(historyId)}/settings`,
    { backgroundSettings },
    guestRequest,
  )
  return data.image
}

export async function deleteHistoryImage(historyId) {
  await axios.delete(
    `${API_BASE_URL}/history/${encodeURIComponent(historyId)}`,
    guestRequest,
  )
}
