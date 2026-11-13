import { useEffect, useRef, useState } from "react"
import { renderGoogleSignInButton } from "../../services/googleIdentity"

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() ?? ""

export default function GoogleSignInButton({
  onCredential,
  onError,
  disabled = false,
}) {
  const buttonRef = useRef(null)
  const callbacksRef = useRef({ onCredential, onError })
  const [loadError, setLoadError] = useState("")

  useEffect(() => {
    callbacksRef.current = { onCredential, onError }
  }, [onCredential, onError])

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return
    const button = buttonRef.current
    if (!button) return

    renderGoogleSignInButton(button, GOOGLE_CLIENT_ID, {
      onCredential: (credential) =>
        callbacksRef.current.onCredential(credential),
      onError: (message) => callbacksRef.current.onError(message),
    })
      .catch(() => {
        if (button.isConnected) {
          setLoadError(
            "Google sign-in could not be loaded. Try again or use your email and password.",
          )
        }
      })

    return () => {
      button.replaceChildren()
    }
  }, [])

  if (!GOOGLE_CLIENT_ID) {
    return (
      <p role="status" className="text-center text-xs text-muted">
        Google sign-in is not configured for this deployment.
      </p>
    )
  }

  return (
    <div
      className={`flex min-h-10 justify-center ${disabled ? "pointer-events-none opacity-60" : ""}`}
      aria-disabled={disabled}
    >
      <div ref={buttonRef} />
      {loadError ? (
        <p role="alert" className="text-center text-sm text-rose-200">
          {loadError}
        </p>
      ) : null}
    </div>
  )
}
