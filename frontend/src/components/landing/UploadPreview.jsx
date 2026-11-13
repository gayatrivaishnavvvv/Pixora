import { useRef, useState } from "react"
import { Link } from "react-router-dom"
import { ImageUp, ShieldCheck } from "lucide-react"
import { buttonClasses } from "../ui/buttonClasses"

const MAX_BYTES = 10 * 1024 * 1024
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]

export default function UploadPreview() {
  const inputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)
  const [file, setFile] = useState(null)
  const [error, setError] = useState("")

  function inspect(next) {
    if (!next) return
    if (!ALLOWED_TYPES.includes(next.type)) {
      setFile(null)
      setError("Use a JPG, PNG, or WEBP image.")
      return
    }
    if (next.size > MAX_BYTES) {
      setFile(null)
      setError("This preview accepts files up to 10 MB.")
      return
    }
    setError("")
    setFile(next)
  }

  return (
    <div className="h-full rounded-xl border border-line bg-canvas p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-ink">Start with an image</p>
          <p className="mt-1 text-xs text-muted">JPG, PNG, or WEBP · Up to 10 MB</p>
        </div>
        <ImageUp size={18} className="text-accent" aria-hidden="true" />
      </div>

      <div
        className={`mt-5 flex min-h-52 flex-col items-center justify-center rounded-lg border border-dashed px-5 py-8 text-center transition-colors ${
          dragOver
            ? "border-accent bg-accent/10"
            : "border-line bg-surface hover:border-accent/50"
        }`}
        onDragOver={(event) => {
          event.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragOver(false)
          inspect(event.dataTransfer.files?.[0])
        }}
      >
        <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl border border-line bg-canvas text-accent">
          <ImageUp size={20} aria-hidden="true" />
        </span>
        <p className="mt-4 text-sm font-medium text-ink">Drop your image here</p>
        <p className="mt-1 text-sm text-muted">or browse files on your device</p>
        <button
          type="button"
          className={buttonClasses("secondary", "mt-5")}
          onClick={() => inputRef.current?.click()}
        >
          Choose an image
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          aria-label="Choose an image to preview"
          onChange={(event) => inspect(event.target.files?.[0])}
        />
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-sm text-rose-300">
          {error}
        </p>
      ) : (
        <p className="mt-3 flex items-center gap-2 text-xs leading-5 text-muted">
          <ShieldCheck size={14} className="shrink-0 text-emerald-400" aria-hidden="true" />
          Your image stays on this device in this preview.
        </p>
      )}

      {file ? (
        <p className="mt-3 truncate rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink" title={file.name}>
          Selected: <span className="font-medium">{file.name}</span>
        </p>
      ) : null}

      <Link to="/workspace" className={`${buttonClasses("primary")} mt-4 w-full`}>
        Open workspace
      </Link>
      <p className="mt-3 text-center text-xs leading-5 text-muted">
        This landing-page preview stays local. Open Workspace to upload and process an image.
      </p>
    </div>
  )
}
