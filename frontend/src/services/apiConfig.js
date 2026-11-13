const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()

if (!apiBaseUrl) {
  throw new Error("VITE_API_BASE_URL must be set in the frontend environment.")
}

export const API_BASE_URL = apiBaseUrl.replace(/\/+$/, "")
