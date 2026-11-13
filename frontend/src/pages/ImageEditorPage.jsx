import { useEffect, useState } from "react"
import { AlertCircle, ArrowLeft, LoaderCircle } from "lucide-react"
import { Link, useLocation } from "react-router-dom"
import ImageEditor from "../components/workspace/ImageEditor"
import Container from "../components/ui/Container"
import PageHeader from "../components/ui/PageHeader"
import { buttonClasses } from "../components/ui/buttonClasses"
import { loadProcessedCutout } from "../services/imageEditorStorage"

export default function ImageEditorPage() {
  const location = useLocation()
  const [cutout, setCutout] = useState(null)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function loadCutout() {
      try {
        const savedCutout = await loadProcessedCutout()
        if (!active) return

        if (!savedCutout?.blob) {
          setCutout(null)
          return
        }

        const cutoutUrl = URL.createObjectURL(savedCutout.blob)
        if (!active) {
          URL.revokeObjectURL(cutoutUrl)
          return
        }
        setCutout({
          url: cutoutUrl,
          imageName: savedCutout.imageName || "pixora-image.png",
        })
      } catch {
        if (active) {
          setError("The processed image could not be loaded from this browser.")
        }
      } finally {
        if (active) setIsLoading(false)
      }
    }

    loadCutout()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    return () => {
      if (cutout?.url) URL.revokeObjectURL(cutout.url)
    }
  }, [cutout?.url])

  return (
    <Container className="max-w-6xl py-10 sm:py-14">
      <Link
        to="/workspace"
        className={buttonClasses("secondary", "mb-6 px-3 py-2 text-sm")}
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Back to workspace
      </Link>

      <PageHeader eyebrow="Phase 5 · Image editing" title="Edit your cutout">
        Adjust the background, position, and scale of your processed image. These
        edits reuse the existing cutout and do not run background removal again.
      </PageHeader>

      <section className="mt-6 overflow-hidden rounded-2xl border border-line bg-surface/85 shadow-xl backdrop-blur-sm">
        {error ? (
          <p
            role="alert"
            className="m-4 flex items-start gap-2 rounded-lg border border-rose-400/20 bg-rose-400/10 px-3 py-2.5 text-sm text-rose-200"
          >
            <AlertCircle size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
            {error}
          </p>
        ) : null}

        {isLoading ? (
          <p
            role="status"
            className="flex items-center gap-2 p-6 text-sm text-muted"
          >
            <LoaderCircle size={17} className="animate-spin" aria-hidden="true" />
            Loading your processed image…
          </p>
        ) : cutout ? (
          <div className="p-3 sm:p-5">
            <ImageEditor
              processedUrl={cutout.url}
              imageName={cutout.imageName}
              historyId={location.state?.historyId}
              onError={setError}
            />
          </div>
        ) : !error ? (
          <div className="p-8 text-center">
            <h2 className="text-base font-medium text-ink">
              No processed image to edit
            </h2>
            <p className="mt-2 text-sm text-muted">
              Return to the workspace and remove the background from an image
              first.
            </p>
            <Link
              to="/workspace"
              className={buttonClasses("primary", "mt-5")}
            >
              Open workspace
            </Link>
          </div>
        ) : null}
      </section>
    </Container>
  )
}
