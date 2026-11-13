import { LoaderCircle } from "lucide-react"
import { Navigate, Outlet, useLocation } from "react-router-dom"
import useAuth from "../../contexts/useAuth"

export default function ProtectedRoute() {
  const { user, isLoading, error, reloadUser } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div role="status" className="flex min-h-72 items-center justify-center gap-3 text-sm text-muted">
        <LoaderCircle size={20} className="animate-spin text-accent" aria-hidden="true" />
        Checking your account…
      </div>
    )
  }
  if (error) {
    return (
      <div className="mx-auto my-16 max-w-lg rounded-xl border border-rose-400/20 bg-rose-400/10 p-5 text-center text-sm text-rose-200">
        <p role="alert">{error}</p>
        <button
          type="button"
          className="mt-4 rounded-lg border border-line px-3 py-2 text-ink"
          onClick={reloadUser}
        >
          Try again
        </button>
      </div>
    )
  }
  return user ? (
    <Outlet />
  ) : (
    <Navigate to="/login" replace state={{ from: location }} />
  )
}
