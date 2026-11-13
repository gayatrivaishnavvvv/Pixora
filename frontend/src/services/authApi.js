import axios from "axios"
import { API_BASE_URL } from "./apiConfig"
const requestConfig = {
  withCredentials: true,
  headers: { "X-Pixora-Request": "1" },
}

export async function registerAccount({ displayName, email, password }) {
  const { data } = await axios.post(
    `${API_BASE_URL}/auth/register`,
    { displayName, email, password },
    requestConfig,
  )
  return data.user
}

export async function loginAccount({ email, password }) {
  const { data } = await axios.post(
    `${API_BASE_URL}/auth/login`,
    { email, password },
    requestConfig,
  )
  return data.user
}

export async function googleLoginAccount(credential) {
  const { data } = await axios.post(
    `${API_BASE_URL}/auth/google`,
    { credential },
    requestConfig,
  )
  return data.user
}

export async function logoutAccount() {
  await axios.post(`${API_BASE_URL}/auth/logout`, {}, requestConfig)
}

export async function getCurrentUser() {
  const { data } = await axios.get(`${API_BASE_URL}/auth/me`, requestConfig)
  return data.user
}

export async function getUserDashboard() {
  const { data } = await axios.get(`${API_BASE_URL}/auth/dashboard`, requestConfig)
  return data
}

export async function saveUserProfile(displayName) {
  const { data } = await axios.patch(
    `${API_BASE_URL}/auth/profile`,
    { displayName },
    requestConfig,
  )
  return data.user
}
