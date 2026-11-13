import { useCallback, useEffect, useState } from "react"
import AuthContext from "./AuthContext"
import {
  getCurrentUser,
  googleLoginAccount,
  loginAccount,
  logoutAccount,
  registerAccount,
  saveUserProfile,
} from "../services/authApi"

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    getCurrentUser()
      .then((account) => {
        if (!active) return
        setUser(account)
        setError("")
      })
      .catch((requestError) => {
        if (!active) return
        if (requestError.response?.status === 401) {
          setUser(null)
        } else {
          setError("Your account status could not be checked. Try again.")
        }
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const reloadUser = useCallback(() => {
    setIsLoading(true)
    setError("")
    return getCurrentUser()
      .then((account) => {
        setUser(account)
        setError("")
      })
      .catch((requestError) => {
        if (requestError.response?.status === 401) {
          setUser(null)
        } else {
          setError("Your account status could not be checked. Try again.")
        }
      })
      .finally(() => setIsLoading(false))
  }, [])

  const signIn = useCallback(async (credentials) => {
    const account = await loginAccount(credentials)
    setUser(account)
    setError("")
    return account
  }, [])

  const signInWithGoogle = useCallback(async (credential) => {
    const account = await googleLoginAccount(credential)
    setUser(account)
    setError("")
    return account
  }, [])

  const signUp = useCallback(async (details) => {
    const account = await registerAccount(details)
    setUser(account)
    setError("")
    return account
  }, [])

  const signOut = useCallback(async () => {
    await logoutAccount()
    setUser(null)
    setError("")
  }, [])

  const updateProfile = useCallback(async (displayName) => {
    const account = await saveUserProfile(displayName)
    setUser(account)
    return account
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        signIn,
        signInWithGoogle,
        signUp,
        signOut,
        updateProfile,
        reloadUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
