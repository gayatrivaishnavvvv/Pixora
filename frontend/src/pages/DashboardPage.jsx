import { useEffect, useState } from "react"
import { ArrowRight, CircleUserRound, ImageIcon, LoaderCircle } from "lucide-react"
import { Link } from "react-router-dom"
import Container from "../components/ui/Container"
import PageHeader from "../components/ui/PageHeader"
import { buttonClasses } from "../components/ui/buttonClasses"
import useAuth from "../contexts/useAuth"
import { getUserDashboard } from "../services/authApi"

export default function DashboardPage() {
  const { user } = useAuth()
  const [dashboard, setDashboard] = useState(null)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true
    getUserDashboard()
      .then((result) => {
        if (active) setDashboard(result)
      })
      .catch((loadError) => {
        if (active) {
          setError(
            loadError.response?.data?.error ??
              "Your dashboard could not be loaded. Please try again.",
          )
        }
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <Container className="max-w-6xl py-10 sm:py-14">
      <PageHeader eyebrow="Your account" title={`Welcome, ${user.displayName}`}>
        Your account dashboard and saved Pixora creations.
      </PageHeader>
      {error ? (
        <p role="alert" className="mt-6 rounded-lg border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-200">
          {error}
        </p>
      ) : null}
      {isLoading ? (
        <p role="status" className="mt-8 flex items-center gap-2 text-sm text-muted">
          <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />
          Loading your dashboard…
        </p>
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <section className="rounded-2xl border border-line bg-surface/80 p-6">
            <ImageIcon size={22} className="text-accent" aria-hidden="true" />
            <h2 className="mt-4 text-lg font-medium text-ink">Image history</h2>
            <p className="mt-2 text-sm text-muted">
              {dashboard?.imageCount ?? 0}{" "}
              {(dashboard?.imageCount ?? 0) === 1 ? "saved image" : "saved images"}
            </p>
            <Link to="/history" className={buttonClasses("primary", "mt-5")}>
              View your history
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </section>
          <section className="rounded-2xl border border-line bg-surface/80 p-6">
            <CircleUserRound size={22} className="text-accent" aria-hidden="true" />
            <h2 className="mt-4 text-lg font-medium text-ink">Profile</h2>
            <p className="mt-2 truncate text-sm text-muted">{user.email}</p>
            <Link to="/profile" className={buttonClasses("secondary", "mt-5")}>
              Manage profile
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </section>
        </div>
      )}
    </Container>
  )
}
