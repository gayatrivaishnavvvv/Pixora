import { ArrowRight, ImageIcon, LoaderCircle, ScanLine } from "lucide-react"
import { Link } from "react-router-dom"
import { buttonClasses } from "../ui/buttonClasses"

export default function BeforeAfterPreview({
  preview,
  processedUrl,
  canOpenEditor,
  isRemoving,
  historyId,
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <article className="min-w-0 overflow-hidden rounded-xl border border-line bg-surface">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-sm font-medium text-ink">Original image</h2>
            <p className="mt-1 truncate text-xs text-muted" title={preview.file.name}>
              {preview.file.name}
            </p>
          </div>
          <span className="shrink-0 rounded-md border border-line bg-canvas px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-muted">
            Original
          </span>
        </div>
        <div className="flex min-h-72 items-center justify-center bg-[#101116] p-4 sm:min-h-104">
          <img
            src={preview.url}
            alt={`Local preview of ${preview.file.name}`}
            className="max-h-100 max-w-full rounded-md object-contain"
          />
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-line px-4 py-3 text-xs text-muted">
          <span>{preview.width} × {preview.height} px</span>
          <span>{formatBytes(preview.file.size)}</span>
        </div>
      </article>

      <article className="min-w-0 overflow-hidden rounded-xl border border-line bg-surface">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div>
            <h2 className="text-sm font-medium text-ink">
              Background-removed result
            </h2>
            <p className="mt-1 text-xs text-muted">
              {processedUrl
                ? "Transparent cutout ready to edit"
                : "Transparent PNG preview"}
            </p>
          </div>
          <span
            className={`shrink-0 rounded-md border px-2 py-1 text-[10px] font-medium uppercase tracking-wide ${
              processedUrl
                ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
                : "border-amber-400/20 bg-amber-400/10 text-amber-200"
            }`}
          >
            {processedUrl ? "Ready" : isRemoving ? "Processing" : "Not processed"}
          </span>
        </div>
        {processedUrl ? (
          <>
            <div className="checkerboard flex min-h-72 items-center justify-center p-4 sm:min-h-104">
              <img
                src={processedUrl}
                alt={`Transparent background-removed result for ${preview.file.name}`}
                className="max-h-100 max-w-full object-contain"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3 border-t border-line px-4 py-3">
              <span className="flex items-center gap-2 text-xs text-muted">
                <ImageIcon size={14} aria-hidden="true" />
                Transparent PNG · saved in history
              </span>
              {canOpenEditor ? (
                <Link
                  to="/editor"
                  state={{ historyId }}
                  className={buttonClasses("primary", "ml-auto px-3 py-2 text-xs")}
                >
                  Edit image
                  <ArrowRight size={14} aria-hidden="true" />
                </Link>
              ) : (
                <span className="ml-auto text-xs text-muted">
                  Editor page unavailable
                </span>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="checkerboard flex min-h-72 items-center justify-center p-4 sm:min-h-104">
              <div className="max-w-xs rounded-xl border border-line bg-canvas/90 p-6 text-center shadow-xl backdrop-blur-sm">
                <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl border border-line bg-surface text-accent">
                  {isRemoving ? (
                    <LoaderCircle size={20} className="animate-spin" aria-hidden="true" />
                  ) : (
                    <ScanLine size={20} aria-hidden="true" />
                  )}
                </span>
                <h3 className="mt-4 text-sm font-medium text-ink">
                  {isRemoving ? "Removing the background…" : "Your cutout will appear here"}
                </h3>
                <p className="mt-2 text-xs leading-5 text-muted">
                  {isRemoving
                    ? "The image is being processed by remove.bg."
                    : "Upload the original, then choose Remove background to create a transparent PNG."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 border-t border-line px-4 py-3 text-xs text-muted">
              <ImageIcon size={14} aria-hidden="true" />
              {isRemoving ? "Processing original image…" : "No processed image has been created"}
            </div>
          </>
        )}
      </article>
    </div>
  )
}

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
