import { useState } from "react"
import { AlertCircle, Check, LoaderCircle } from "lucide-react"
import Container from "../components/ui/Container"
import PageHeader from "../components/ui/PageHeader"
import { buttonClasses } from "../components/ui/buttonClasses"
import useAuth from "../contexts/useAuth"

export default function ProfilePage() {
  const { user, updateProfile } = useAuth()
  const [displayName, setDisplayName] = useState(user.displayName)
  const [error, setError] = useState("")
  const [saved, setSaved] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError("")
    setSaved(false)
    setIsSaving(true)
    try {
      await updateProfile(displayName)
      setSaved(true)
    } catch (saveError) {
      setError(
        saveError.response?.data?.error ?? "Your profile could not be updated.",
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Container className="max-w-2xl py-10 sm:py-14">
      <PageHeader eyebrow="Your account" title="Profile">
        Manage the name associated with your Pixora account.
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
        {saved ? (
          <p role="status" className="flex items-center gap-2 text-sm text-emerald-200">
            <Check size={16} aria-hidden="true" />
            Profile updated.
          </p>
        ) : null}
        <label className="block text-sm text-muted">
          Name
          <input
            type="text"
            autoComplete="name"
            required
            minLength={2}
            maxLength={80}
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            className="mt-2 w-full rounded-lg border border-line bg-canvas px-3 py-3 text-ink outline-none focus:border-accent"
          />
        </label>
        <label className="block text-sm text-muted">
          Email
          <input
            type="email"
            value={user.email}
            readOnly
            className="mt-2 w-full cursor-not-allowed rounded-lg border border-line bg-canvas px-3 py-3 text-muted"
          />
          <span className="mt-2 block text-xs">Email changes are not available yet.</span>
        </label>
        <button
          type="submit"
          disabled={isSaving}
          className={`${buttonClasses("primary")} disabled:cursor-not-allowed disabled:opacity-60`}
        >
          {isSaving ? (
            <LoaderCircle size={15} className="animate-spin" aria-hidden="true" />
          ) : null}
          {isSaving ? "Saving…" : "Save profile"}
        </button>
      </form>
    </Container>
  )
}
