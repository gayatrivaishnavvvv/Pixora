import axios from "axios"

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000/api/v1"

export async function uploadOriginalImage(file, onProgress) {
  const { data: session } = await axios.post(`${API_BASE_URL}/uploads/session`)
  const { data: signedUpload } = await axios.post(
    `${API_BASE_URL}/uploads/signature`,
    {},
    { headers: { Authorization: `Bearer ${session.token}` } },
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
        if (event.total) {
          onProgress(Math.round((event.loaded / event.total) * 100))
        }
      },
    },
  )

  const { data: verified } = await axios.post(
    `${API_BASE_URL}/uploads/verify`,
    { publicId: cloudinaryAsset.public_id },
    { headers: { Authorization: `Bearer ${session.token}` } },
  )

  return {
    asset: verified.asset,
    guestSessionToken: session.token,
  }
}

export async function deleteGuestUpload(guestSessionToken, publicId) {
  await axios.delete(`${API_BASE_URL}/uploads/asset`, {
    data: { publicId },
    headers: { Authorization: `Bearer ${guestSessionToken}` },
  })
}

export async function processBackgroundRemoval(guestSessionToken, publicId) {
  try {
    const { data } = await axios.post(
      `${API_BASE_URL}/uploads/remove-background`,
      { publicId },
      {
        headers: { Authorization: `Bearer ${guestSessionToken}` },
        responseType: "blob",
      },
    )
    return data
  } catch (error) {
    const responseData = error.response?.data
    if (
      responseData instanceof Blob &&
      responseData.type.includes("application/json")
    ) {
      const payload = JSON.parse(await responseData.text())
      throw new Error(payload.error ?? "Background removal failed.")
    }
    throw error
  }
}
