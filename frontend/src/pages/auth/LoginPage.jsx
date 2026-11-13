import { useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { AlertCircle, LoaderCircle, LockKeyhole } from "lucide-react"
import useAuth from "../../contexts/useAuth"
import GoogleSignInButton from "../../components/auth/GoogleSignInButton"
import Container from "../../components/ui/Container"
import PageHeader from "../../components/ui/PageHeader"
import { buttonClasses } from "../../components/ui/buttonClasses"

export default function LoginPage() {
  const { signIn, signInWithGoogle } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError("")
    setIsSubmitting(true)
    try {
      await signIn({ email, password })
      const destination = location.state?.from
      navigate(destination?.pathname ?? "/dashboard", {
        replace: true,
        state: destination?.state,
      })
    } catch (loginError) {
      setError(getErrorMessage(loginError, "Sign in could not be completed."))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleGoogleCredential(credential) {
    setError("")
    setIsSubmitting(true)
    try {
      await signInWithGoogle(credential)
      const destination = location.state?.from
      navigate(destination?.pathname ?? "/dashboard", {
        replace: true,
        state: destination?.state,
      })
    } catch (loginError) {
      setError(getErrorMessage(loginError, "Google sign-in could not be completed."))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Container className="max-w-xl py-12 sm:py-16">
      <PageHeader eyebrow="Welcome back" title="Sign in to Pixora">
        Access your profile and saved image history.
      </PageHeader>
      <form
        onSubmit={handleSubmit}
        className="mt-8 space-y-5 rounded-2xl border border-line bg-surface/80 p-5 shadow-xl sm:p-7"
      >
        {error ? (
          <p role="alert" className="flex items-start gap-2 text-sm text-rose-200">
            <AlertCircle size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
            {error}
          </p>
        ) : null}
        <label className="block text-sm text-muted">
          Email
          <input
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 w-full rounded-lg border border-line bg-canvas px-3 py-3 text-ink outline-none focus:border-accent"
          />
        </label>
        <label className="block text-sm text-muted">
          Password
          <input
            type="password"
            autoComplete="current-password"
            required
            maxLength={72}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 w-full rounded-lg border border-line bg-canvas px-3 py-3 text-ink outline-none focus:border-accent"
          />
        </label>
        <button
          type="submit"
          disabled={isSubmitting}
          className={`${buttonClasses("primary", "w-full")} disabled:cursor-not-allowed disabled:opacity-60`}
        >
          {isSubmitting ? (
            <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
          ) : (
            <LockKeyhole size={16} aria-hidden="true" />
          )}
          {isSubmitting ? "Signing in…" : "Sign in"}
        </button>
        <div className="flex items-center gap-3 text-xs text-muted">
          <span className="h-px flex-1 bg-line" />
          <span>or continue with</span>
          <span className="h-px flex-1 bg-line" />
        </div>
        <GoogleSignInButton
          onCredential={handleGoogleCredential}
          onError={setError}
          disabled={isSubmitting}
        />
        <p className="text-center text-sm text-muted">
          New to Pixora?{" "}
          <Link to="/register" className="font-medium text-accent hover:text-accent-hover">
            Create an account
          </Link>
        </p>
      </form>
    </Container>
  )
}

function getErrorMessage(error, fallback) {
  const message = error.response?.data?.error
  return typeof message === "string" ? message : fallback
}
