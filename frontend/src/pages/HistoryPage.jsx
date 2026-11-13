import { useCallback, useEffect, useState } from "react"
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  Clock3,
  ImageIcon,
  LoaderCircle,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import Container from "../components/ui/Container"
import PageHeader from "../components/ui/PageHeader"
import { buttonClasses } from "../components/ui/buttonClasses"
import useAuth from "../contexts/useAuth"
import {
  deleteHistoryImage,
  listHistoryImages,
} from "../services/uploadApi"

const FILTERS = [
  { value: "all", label: "All Images" },
  { value: "processed", label: "Background Removed" },
  { value: "edited", label: "Edited Images" },
]

export default function HistoryPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [images, setImages] = useState([])
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("all")
  const [sort, setSort] = useState("newest")
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedImage, setSelectedImage] = useState(null)
  const [comparison, setComparison] = useState(50)
  const [deletingId, setDeletingId] = useState("")

  const loadHistory = useCallback(async () => {
    setIsLoading(true)
    setError("")
    try {
      const result = await listHistoryImages({ search, filter, sort, page })
      setImages(result.images)
      setPagination({ total: result.total, totalPages: result.totalPages })
    } catch (loadError) {
      setImages([])
      setPagination({ total: 0, totalPages: 0 })
      setError(getErrorMessage(loadError, "Your image history could not be loaded."))
    } finally {
      setIsLoading(false)
    }
  }, [filter, page, search, sort])

  useEffect(() => {
    const timer = window.setTimeout(loadHistory, 250)
    return () => window.clearTimeout(timer)
  }, [loadHistory])

  useEffect(() => {
    if (!selectedImage) return
    function closeOnEscape(event) {
      if (event.key === "Escape") setSelectedImage(null)
    }
    window.addEventListener("keydown", closeOnEscape)
    return () => window.removeEventListener("keydown", closeOnEscape)
  }, [selectedImage])

  function changeFilter(value) {
    setFilter(value)
    setPage(1)
  }

  function changeSearch(value) {
    setSearch(value)
    setPage(1)
  }

  async function handleDelete(image) {
    if (
      !window.confirm(
        `Delete "${image.originalFilename}" and its stored image assets? This cannot be undone.`,
      )
    ) {
      return
    }

    setDeletingId(image._id)
    setError("")
    try {
      await deleteHistoryImage(image._id)
      if (selectedImage?._id === image._id) setSelectedImage(null)
      await loadHistory()
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, "This history image could not be deleted."))
    } finally {
      setDeletingId("")
    }
  }

  function continueEditing(image) {
    if (!image.processedSecureUrl) return
    navigate("/workspace", { state: { historyId: image._id } })
  }

  return (
    <Container className="max-w-7xl py-10 sm:py-14">
      <PageHeader eyebrow="History" title="Your Image History">
        Access and continue editing your previous creations.
      </PageHeader>
      <p className="mt-3 text-xs text-muted">
        {user
          ? "Your account history stays available until you delete an image."
          : "Guest history and its Cloudinary assets are retained for 30 days from your guest session."}
      </p>

      <section className="mt-8 rounded-2xl border border-line bg-surface/75 p-4 shadow-xl backdrop-blur-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <label className="relative block min-w-0 flex-1 lg:max-w-xl">
            <Search
              size={17}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => changeSearch(event.target.value)}
              placeholder="Search images by filename or title"
              aria-label="Search image history"
              className="w-full rounded-lg border border-line bg-canvas py-3 pl-10 pr-4 text-sm text-ink outline-none transition focus:border-accent"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-muted">
            <SlidersHorizontal size={16} aria-hidden="true" />
            <span>Sort by</span>
            <select
              value={sort}
              onChange={(event) => {
                setSort(event.target.value)
                setPage(1)
              }}
              className="rounded-lg border border-line bg-canvas px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
              aria-label="Sort history"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filter images">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              aria-pressed={filter === item.value}
              onClick={() => changeFilter(item.value)}
              className={buttonClasses(
                filter === item.value ? "primary" : "secondary",
                "px-3 py-2 text-xs",
              )}
            >
              {item.label}
            </button>
          ))}
          {!isLoading ? (
            <span className="ml-auto self-center text-xs text-muted">
              {pagination.total} {pagination.total === 1 ? "image" : "images"}
            </span>
          ) : null}
        </div>
      </section>

      {error ? (
        <div
          role="alert"
          className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200"
        >
          <span>{error}</span>
          <button
            type="button"
            className={buttonClasses("secondary", "px-3 py-2 text-xs")}
            onClick={loadHistory}
          >
            Try again
          </button>
        </div>
      ) : null}

      {isLoading ? (
        <div
          role="status"
          className="flex min-h-64 items-center justify-center gap-3 text-sm text-muted"
        >
          <LoaderCircle size={20} className="animate-spin text-accent" aria-hidden="true" />
          Loading your saved images…
        </div>
      ) : error ? null : images.length ? (
        <>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {images.map((image) => (
              <HistoryCard
                key={image._id}
                image={image}
                deleting={deletingId === image._id}
                onPreview={() => {
                  setComparison(50)
                  setSelectedImage(image)
                }}
                onContinue={() => continueEditing(image)}
                onDelete={() => handleDelete(image)}
              />
            ))}
          </div>
          {pagination.totalPages > 1 ? (
            <nav className="mt-8 flex items-center justify-center gap-3" aria-label="History pages">
              <button
                type="button"
                disabled={page <= 1}
                className={buttonClasses("secondary", "px-3 py-2 disabled:opacity-40")}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                <ArrowLeft size={15} aria-hidden="true" />
                Previous
              </button>
              <span className="text-sm text-muted">
                Page {page} of {pagination.totalPages}
              </span>
              <button
                type="button"
                disabled={page >= pagination.totalPages}
                className={buttonClasses("secondary", "px-3 py-2 disabled:opacity-40")}
                onClick={() => setPage((value) => Math.min(pagination.totalPages, value + 1))}
              >
                Next
                <ArrowRight size={15} aria-hidden="true" />
              </button>
            </nav>
          ) : null}
        </>
      ) : (
        <div className="mt-6 flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-surface/50 px-6 py-12 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl border border-line bg-canvas text-accent">
            <ImageIcon size={24} aria-hidden="true" />
          </span>
          <h2 className="mt-5 text-lg font-medium text-ink">
            {search ? "No matching images" : "Your history is waiting"}
          </h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-muted">
            {search
              ? "Try another filename or clear your search to see your saved images."
              : "Upload an image in the workspace and remove its background. Your real creations will appear here."}
          </p>
          <Link to="/workspace" className={buttonClasses("primary", "mt-5")}>
            Open workspace
          </Link>
        </div>
      )}

      {selectedImage ? (
        <PreviewModal
          image={selectedImage}
          comparison={comparison}
          onComparisonChange={setComparison}
          onClose={() => setSelectedImage(null)}
          onContinue={() => continueEditing(selectedImage)}
        />
      ) : null}
    </Container>
  )
}

function HistoryCard({ image, deleting, onPreview, onContinue, onDelete }) {
  const processed = Boolean(image.processedSecureUrl)
  const downloadUrl = image.processedDownloadUrl || image.processedSecureUrl
  const status =
    image.status === "edited"
      ? "Edited"
      : processed
        ? "Background removed"
        : "Uploaded"

  return (
    <article className="overflow-hidden rounded-2xl border border-line bg-surface/80 shadow-lg">
      <button
        type="button"
        className="grid w-full grid-cols-2 border-b border-line text-left"
        onClick={onPreview}
        aria-label={`Preview ${image.originalFilename}`}
      >
        <Thumbnail
          label="Original"
          src={image.originalThumbnailUrl || image.originalSecureUrl}
          checkerboard={false}
        />
        <Thumbnail
          label="Processed"
          src={image.processedThumbnailUrl || image.processedSecureUrl}
          checkerboard={processed}
        />
      </button>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-medium text-ink" title={image.originalFilename}>
              {image.originalFilename}
            </h2>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
              <Clock3 size={13} aria-hidden="true" />
              {processed
                ? `Processed ${new Date(image.processedAt || image.updatedAt).toLocaleString()}`
                : `Uploaded ${new Date(image.createdAt).toLocaleString()}`}
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-medium ${
              processed
                ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
                : "border-amber-400/20 bg-amber-400/10 text-amber-200"
            }`}
          >
            {status}
          </span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onPreview}
            className={buttonClasses("secondary", "px-3 py-2 text-xs")}
          >
            Preview
          </button>
          <button
            type="button"
            disabled={!processed}
            onClick={onContinue}
            className={buttonClasses("primary", "px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50")}
          >
            Continue editing
          </button>
          {processed ? (
            <a
              href={downloadUrl}
              download={`${image.originalFilename.replace(/\.[^.]+$/, "")}-cutout.png`}
              className={buttonClasses("secondary", "ml-auto px-3 py-2 text-xs")}
            >
              <ArrowDownToLine size={14} aria-hidden="true" />
              Download
            </a>
          ) : null}
          <button
            type="button"
            disabled={deleting}
            onClick={onDelete}
            className={buttonClasses("secondary", "px-3 py-2 text-xs text-rose-300 hover:text-rose-200 disabled:opacity-50")}
            aria-label={`Delete ${image.originalFilename}`}
          >
            {deleting ? (
              <LoaderCircle size={14} className="animate-spin" aria-hidden="true" />
            ) : (
              <Trash2 size={14} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
    </article>
  )
}

function Thumbnail({ label, src, checkerboard }) {
  return (
    <div className={`relative flex h-36 items-center justify-center p-3 ${checkerboard ? "checkerboard" : "bg-canvas"}`}>
      {src ? (
        <img src={src} alt="" className="max-h-full max-w-full object-contain" loading="lazy" />
      ) : (
        <span className="text-xs text-muted">Not processed</span>
      )}
      <span className="absolute bottom-2 left-2 rounded bg-canvas/85 px-2 py-1 text-[10px] text-muted">
        {label}
      </span>
    </div>
  )
}

function PreviewModal({ image, comparison, onComparisonChange, onClose, onContinue }) {
  const processed = Boolean(image.processedSecureUrl)
  const downloadUrl = image.processedDownloadUrl || image.processedSecureUrl

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-3 backdrop-blur-sm sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-preview-title"
        className="my-auto w-full max-w-4xl overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-line px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 id="history-preview-title" className="truncate text-base font-semibold text-ink">
              {image.originalFilename}
            </h2>
            <p className="mt-1 text-xs text-muted">
              {processed
                ? `Processed ${new Date(image.processedAt || image.updatedAt).toLocaleString()}`
                : `Uploaded ${new Date(image.createdAt).toLocaleString()}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line text-muted hover:text-ink"
            aria-label="Close preview"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <div className="p-4 sm:p-6">
          {processed ? (
            <>
              <div className="checkerboard relative mx-auto aspect-4/3 max-h-[60vh] overflow-hidden rounded-xl border border-line">
                <img
                  src={image.originalSecureUrl}
                  alt={`Original ${image.originalFilename}`}
                  className="absolute inset-0 h-full w-full object-contain"
                  style={{ clipPath: `inset(0 ${100 - comparison}% 0 0)` }}
                />
                <img
                  src={image.processedSecureUrl}
                  alt={`Background removed ${image.originalFilename}`}
                  className="absolute inset-0 h-full w-full object-contain"
                  style={{ clipPath: `inset(0 0 0 ${comparison}%)` }}
                />
                <span className="absolute left-3 top-3 rounded bg-canvas/85 px-2.5 py-1.5 text-xs text-ink">
                  Before
                </span>
                <span className="absolute right-3 top-3 rounded bg-canvas/85 px-2.5 py-1.5 text-xs text-ink">
                  After · transparent PNG
                </span>
                <div
                  className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow"
                  style={{ left: `${comparison}%` }}
                />
              </div>
              <label className="mt-4 flex items-center gap-3 text-xs text-muted">
                Compare before and after
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={comparison}
                  onChange={(event) => onComparisonChange(Number(event.target.value))}
                  className="w-full accent-accent"
                  aria-label="Before and after comparison"
                />
              </label>
            </>
          ) : (
            <div className="flex min-h-72 items-center justify-center rounded-xl border border-line bg-canvas">
              <img
                src={image.originalSecureUrl}
                alt={image.originalFilename}
                className="max-h-[55vh] max-w-full object-contain"
              />
            </div>
          )}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted">
              {image.dimensions.width} × {image.dimensions.height} px ·{" "}
              {formatBytes(image.fileSize)}
            </p>
            <div className="flex flex-wrap gap-2">
              {processed ? (
                <a
                  href={downloadUrl}
                  download={`${image.originalFilename.replace(/\.[^.]+$/, "")}-cutout.png`}
                  className={buttonClasses("secondary", "px-3 py-2 text-xs")}
                >
                  <ArrowDownToLine size={14} aria-hidden="true" />
                  Download PNG
                </a>
              ) : null}
              <button
                type="button"
                disabled={!processed}
                onClick={onContinue}
                className={buttonClasses("primary", "px-3 py-2 text-xs disabled:opacity-50")}
              >
                Continue editing
                <ArrowRight size={14} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getErrorMessage(error, fallback) {
  const responseError = error?.response?.data?.error
  if (typeof responseError === "string") return responseError
  if (typeof error?.message === "string") return error.message
  return fallback
}
