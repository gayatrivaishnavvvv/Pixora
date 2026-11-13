const GOOGLE_IDENTITY_SCRIPT = "https://accounts.google.com/gsi/client"
let googleIdentityPromise
let initializedClientId = ""
let activeHandlers

export function loadGoogleIdentityServices() {
  if (window.google?.accounts?.id) {
    return Promise.resolve(window.google)
  }
  if (googleIdentityPromise) return googleIdentityPromise

  googleIdentityPromise = new Promise((resolve, reject) => {
    let script = document.querySelector(`script[src="${GOOGLE_IDENTITY_SCRIPT}"]`)
    const onLoad = () => {
      if (window.google?.accounts?.id) {
        resolve(window.google)
      } else {
        reject(new Error("Google sign-in could not be initialized."))
      }
    }
    const onError = () => reject(new Error("Google sign-in could not be loaded."))

    if (!script) {
      script = document.createElement("script")
      script.src = GOOGLE_IDENTITY_SCRIPT
      script.async = true
      script.defer = true
    }
    script.addEventListener("load", onLoad, { once: true })
    script.addEventListener("error", onError, { once: true })
    if (!script.isConnected) document.head.appendChild(script)
  }).catch((error) => {
    googleIdentityPromise = undefined
    throw error
  })

  return googleIdentityPromise
}

export async function renderGoogleSignInButton(
  container,
  clientId,
  handlers,
) {
  const google = await loadGoogleIdentityServices()
  if (!container.isConnected) return
  if (initializedClientId && initializedClientId !== clientId) {
    throw new Error("Google sign-in is already initialized with another client ID.")
  }

  activeHandlers = handlers
  if (!initializedClientId) {
    google.accounts.id.initialize({
      client_id: clientId,
      auto_select: false,
      callback: (response) => {
        if (typeof response?.credential !== "string") {
          activeHandlers?.onError(
            "Google did not return a sign-in credential. Try again.",
          )
          return
        }
        void activeHandlers?.onCredential(response.credential)
      },
    })
    initializedClientId = clientId
  }

  google.accounts.id.renderButton(container, {
    theme: "outline",
    size: "large",
    shape: "rectangular",
    text: "continue_with",
    logo_alignment: "left",
    width: Math.min(
      400,
      Math.max(240, Math.floor(container.getBoundingClientRect().width)),
    ),
  })
}
