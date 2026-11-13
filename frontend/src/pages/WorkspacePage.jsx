import { useEffect, useRef, useState } from "react"
import { Link, useLocation } from "react-router-dom"
import {
  AlertCircle,
  FileImage,
  ImageUp,
  LoaderCircle,
  ShieldCheck,
  WandSparkles,
  X,
} from "lucide-react"
import Container from "../components/ui/Container"
import PageHeader from "../components/ui/PageHeader"
import { buttonClasses } from "../components/ui/buttonClasses"
import BeforeAfterPreview from "../components/workspace/BeforeAfterPreview"
import {
  completeHistoryProcessing,
  createHistoryImage,
  deleteGuestUpload,
  getHistoryImageAssets,
  getHistoryImage,
  processBackgroundRemoval,
  uploadOriginalImage,
  uploadProcessedImage,
} from "../services/uploadApi"
import { clearProcessedCutout, saveProcessedCutout } from "../services/imageEditorStorage"
import useAuth from "../contexts/useAuth"

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"]

export default function WorkspacePage() {
  const { user } = useAuth()
  const location = useLocation()
  const inputRef = useRef(null)
  const latestSelection = useRef(0)
  const [preview, setPreview] = useState(null)
  const [isPreparing, setIsPreparing] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isRemovingBackground, setIsRemovingBackground] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadedAsset, setUploadedAsset] = useState(null)
  const [historyRecordId, setHistoryRecordId] = useState("")
  const [isLoadingHistory, setIsLoadingHistory] = useState(
    Boolean(location.state?.historyId),
  )
  const [processedUrl, setProcessedUrl] = useState("")
  const [canOpenEditor, setCanOpenEditor] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState("")
  const [requiresAccount, setRequiresAccount] = useState(false)

  useEffect(() => {
    return () => {
      latestSelection.current += 1
    }
  }, [])

  useEffect(() => {
    return () => {
      if (preview?.url) URL.revokeObjectURL(preview.url)
    }
  }, [preview])

  useEffect(() => {
    return () => {
      if (processedUrl) URL.revokeObjectURL(processedUrl)
    }
  }, [processedUrl])

  useEffect(() => {
    const historyId = location.state?.historyId
    if (!historyId) return
    let active = true
    async function reopenImage() {
      let originalUrl = ""
      let nextProcessedUrl = ""
      let committed = false
      try {
        const image = await getHistoryImage(historyId)
        const assets = await getHistoryImageAssets(
          historyId,
          Boolean(image.processedPublicId),
        )
        originalUrl = URL.createObjectURL(assets.original)
        if (assets.processed) {
          nextProcessedUrl = URL.createObjectURL(assets.processed)
          await saveProcessedCutout(assets.processed, image.originalFilename)
        }
        const nextPreview = {
          file: { name: image.originalFilename, size: image.fileSize },
          url: originalUrl,
          width: image.dimensions.width,
          height: image.dimensions.height,
        }
        if (!active) {
          URL.revokeObjectURL(originalUrl)
          if (nextProcessedUrl) URL.revokeObjectURL(nextProcessedUrl)
          return
        }
        setPreview(nextPreview)
        setUploadedAsset({
          publicId: image.originalPublicId,
          secureUrl: image.originalSecureUrl,
          width: image.dimensions.width,
          height: image.dimensions.height,
          format: image.originalFormat,
        })
        setHistoryRecordId(image._id)
        setProcessedUrl(nextProcessedUrl)
        setCanOpenEditor(Boolean(assets.processed))
        committed = true
        try {
          window.localStorage.setItem(
            "pixora.image-editor.settings.v1",
            JSON.stringify(image.backgroundSettings),
          )
        } catch {
          setError("The image reopened, but its editing settings could not be restored.")
        }
      } catch (loadError) {
        if (!committed) {
          if (originalUrl) URL.revokeObjectURL(originalUrl)
          if (nextProcessedUrl) URL.revokeObjectURL(nextProcessedUrl)
        }
        if (active) {
          setError(
            getErrorMessage(loadError, "This history image could not be reopened."),
          )
        }
      } finally {
        if (active) setIsLoadingHistory(false)
      }
    }

    reopenImage()
    return () => {
      active = false
    }
  }, [location.state?.historyId])

  function chooseFile() {
    inputRef.current?.click()
  }

  function handleFile(file) {
    if (!file) return

    if (uploadedAsset || isRemovingBackground) {
      setError("Delete the uploaded image before choosing another one.")
      return
    }

    if (!ACCEPTED_TYPES.includes(file.type)) {
      latestSelection.current += 1
      setUploadedAsset(null)
      setHistoryRecordId("")
      setError("Choose a JPG, PNG, or WEBP image.")
      setIsPreparing(false)
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      latestSelection.current += 1
      setUploadedAsset(null)
      setError("This image is larger than 10 MB. Choose a smaller file.")
      setIsPreparing(false)
      return
    }

    clearProcessedCutout().catch(() => {
      setError("The previous processed image could not be cleared from this browser.")
    })
    const selectionId = latestSelection.current + 1
    latestSelection.current = selectionId
    setError("")
    setUploadedAsset(null)
    setProcessedUrl("")
    setCanOpenEditor(false)
    setUploadProgress(0)
    setIsPreparing(true)

    const url = URL.createObjectURL(file)
    const image = new Image()

    image.onload = () => {
      if (selectionId !== latestSelection.current) {
        URL.revokeObjectURL(url)
        return
      }

      setPreview({
        file,
        url,
        width: image.naturalWidth,
        height: image.naturalHeight,
      })
      setIsPreparing(false)
    }

    image.onerror = () => {
      URL.revokeObjectURL(url)
      if (selectionId !== latestSelection.current) return
      setError("This file could not be opened as an image. Try another file.")
      setIsPreparing(false)
    }

    image.src = url
  }

  function handleInputChange(event) {
    handleFile(event.target.files?.[0])
    event.target.value = ""
  }

  function handleDrop(event) {
    event.preventDefault()
    setIsDragging(false)
    handleFile(event.dataTransfer.files?.[0])
  }

  async function clearPreview() {
    if (isUploading || isDeleting || isRemovingBackground) return

    if (uploadedAsset && !historyRecordId) {
      setError("")
      setIsDeleting(true)
      try {
        await deleteGuestUpload(uploadedAsset.publicId)
      } catch (deleteError) {
        setError(
          getErrorMessage(
            deleteError,
            "The Cloudinary image could not be deleted. Try again before removing this preview.",
          ),
        )
        setIsDeleting(false)
        return
      }
      setIsDeleting(false)
    }

    latestSelection.current += 1
    setPreview(null)
    setUploadedAsset(null)
    setHistoryRecordId("")
    setProcessedUrl("")
    setCanOpenEditor(false)
    clearProcessedCutout().catch(() => {
      setError("The processed image could not be cleared from this browser.")
    })
    setError("")
    setIsPreparing(false)
    setIsUploading(false)
    setUploadProgress(0)
  }

  async function uploadImage() {
    if (!preview || isUploading || isRemovingBackground || uploadedAsset) return

    setError("")
    setIsUploading(true)
    setUploadProgress(0)

    try {
      const upload = await uploadOriginalImage(preview.file, setUploadProgress)
      let historyImage
      try {
        historyImage = await createHistoryImage(
          upload.asset.publicId,
          preview.file.name,
        )
      } catch (saveError) {
        await deleteGuestUpload(upload.asset.publicId)
        throw saveError
      }
      setUploadedAsset({
        ...upload.asset,
      })
      setHistoryRecordId(historyImage._id)
    } catch (uploadError) {
      setError(
        getErrorMessage(
          uploadError,
          "Upload failed. Check that the backend and Cloudinary settings are ready, then try again.",
        ),
      )
    } finally {
      setIsUploading(false)
    }
  }

  async function removeBackground() {
    if (
      !preview ||
      isUploading ||
      isDeleting ||
      isRemovingBackground ||
      processedUrl
    ) {
      return
    }

    const selectionId = latestSelection.current
    setError("")
    setRequiresAccount(false)

    let asset = uploadedAsset
    if (!asset) {
      setIsUploading(true)
      setUploadProgress(0)
      try {
        const upload = await uploadOriginalImage(preview.file, setUploadProgress)
        asset = upload.asset
        let historyImage
        try {
          historyImage = await createHistoryImage(
            asset.publicId,
            preview.file.name,
          )
        } catch (saveError) {
          await deleteGuestUpload(asset.publicId)
          throw saveError
        }
        setUploadedAsset(asset)
        setHistoryRecordId(historyImage._id)
        asset.historyRecordId = historyImage._id
      } catch (uploadError) {
        setError(
          getErrorMessage(
            uploadError,
            "Upload failed. Check that the backend and Cloudinary settings are ready, then try again.",
          ),
        )
        return
      } finally {
        setIsUploading(false)
      }
    }

    setIsRemovingBackground(true)

    try {
      const result = await processBackgroundRemoval(asset.publicId)
      const processedFilename = `${preview.file.name.replace(/\.[^.]+$/, "") || "pixora-image"}.png`
      const processedAsset = await uploadProcessedImage(result, processedFilename)
      const historyId = historyRecordId || asset.historyRecordId
      if (!historyId) {
        await deleteGuestUpload(processedAsset.publicId)
        throw new Error("The uploaded image could not be found in history.")
      }
      try {
        await completeHistoryProcessing(historyId, processedAsset.publicId)
      } catch (saveError) {
        await deleteGuestUpload(processedAsset.publicId)
        throw saveError
      }
      const resultUrl = URL.createObjectURL(result)
      if (selectionId !== latestSelection.current) {
        URL.revokeObjectURL(resultUrl)
        return
      }
      setProcessedUrl(resultUrl)
      try {
        await saveProcessedCutout(result, preview.file.name)
        setCanOpenEditor(true)
      } catch {
        setCanOpenEditor(false)
        setError(
          "Background removal succeeded, but this browser could not save the cutout for the editor page.",
        )
      }
    } catch (removeError) {
      setRequiresAccount(removeError.code === "GUEST_PROCESSING_LIMIT")
      setError(
        getErrorMessage(
          removeError,
          "Background removal failed. Check the backend configuration and try again.",
        ),
      )
    } finally {
      setIsRemovingBackground(false)
    }
  }

  return (
    <Container className="max-w-7xl py-10 sm:py-14">
      <PageHeader eyebrow="Workspace · Background removal" title="Image workspace">
        {uploadedAsset
          ? "Your original is stored in your secure image history. Choose Remove background to create a transparent PNG."
          : "Choose an image to preview it beside the transparent-result canvas. Remove background will upload it and create a transparent PNG."}
      </PageHeader>

      {!user ? (
        <p className="mt-5 rounded-xl border border-accent/20 bg-accent/10 px-4 py-3 text-sm text-muted">
          Try background removal on 2 images as a guest.{" "}
          <Link to="/register" className="font-medium text-accent hover:text-accent-hover">
            Create an account
          </Link>{" "}
          or sign in to process more.
        </p>
      ) : null}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface/80 px-4 py-3 backdrop-blur-sm">
        <p className="flex items-center gap-2 text-sm text-muted">
          <ShieldCheck size={16} className="shrink-0 text-emerald-400" aria-hidden="true" />
          {uploadedAsset
            ? "Original uploaded to Cloudinary — processing only starts when you choose Remove background."
            : "Local preview only — Remove background uploads the image before processing."}
        </p>
        <span className="rounded-md border border-line bg-canvas px-2 py-1 text-xs text-muted">
          JPG · PNG · WEBP · 10 MB max
        </span>
      </div>

      <section className="mt-5 overflow-hidden rounded-2xl border border-line bg-surface/85 shadow-xl backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line bg-canvas text-accent">
              <FileImage size={18} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-medium text-ink">Preview canvas</h2>
              <p className="mt-0.5 truncate text-xs text-muted">
                {preview ? preview.file.name : "No image selected"}
              </p>
            </div>
          </div>
          {preview ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                disabled={
                  isUploading ||
                  isDeleting ||
                  isRemovingBackground ||
                  Boolean(processedUrl)
                }
                title={
                  !uploadedAsset
                    ? "Upload the original image and remove its background."
                    : processedUrl
                      ? "The transparent PNG is ready to download."
                      : undefined
                }
                className={buttonClasses("primary", "disabled:cursor-not-allowed disabled:opacity-50")}
                onClick={removeBackground}
              >
                {isRemovingBackground ? (
                  <LoaderCircle size={15} className="animate-spin" aria-hidden="true" />
                ) : isUploading ? (
                  <LoaderCircle size={15} className="animate-spin" aria-hidden="true" />
                ) : (
                  <WandSparkles size={15} aria-hidden="true" />
                )}
                {isUploading
                  ? "Uploading original…"
                  : isRemovingBackground
                  ? "Removing background…"
                  : processedUrl
                    ? "Background removed"
                    : "Remove background"}
              </button>
              <button
                type="button"
                disabled={
                  isUploading ||
                  isDeleting ||
                  isRemovingBackground ||
                  Boolean(uploadedAsset)
                }
                title={
                  uploadedAsset
                    ? "Remove the uploaded image first before replacing it."
                    : undefined
                }
                className={buttonClasses("secondary", "px-3 py-2 disabled:cursor-not-allowed disabled:opacity-60")}
                onClick={uploadImage}
              >
                {isUploading ? (
                  <LoaderCircle size={15} className="animate-spin" aria-hidden="true" />
                ) : uploadedAsset ? (
                  <ShieldCheck size={15} aria-hidden="true" />
                ) : (
                  <ImageUp size={15} aria-hidden="true" />
                )}
                {isUploading
                  ? `Uploading ${uploadProgress}%`
                  : uploadedAsset
                    ? "Uploaded to Cloudinary"
                    : "Upload original"}
              </button>
              <button
                type="button"
                disabled={
                  Boolean(uploadedAsset) ||
                  isUploading ||
                  isDeleting ||
                  isRemovingBackground
                }
                className={buttonClasses("secondary", "px-3 py-2")}
                onClick={chooseFile}
                title={
                  uploadedAsset
                    ? "Delete the uploaded image before replacing it."
                    : undefined
                }
              >
                <ImageUp size={15} aria-hidden="true" />
                Replace image
              </button>
              <button
                type="button"
                disabled={isUploading || isDeleting || isRemovingBackground}
                className={buttonClasses("secondary", "px-3 py-2 text-rose-300 hover:bg-rose-400/10 hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-60")}
                onClick={clearPreview}
                title={
                  uploadedAsset
                    ? historyRecordId
                      ? "Clear the workspace without deleting this history image"
                      : "Delete the uploaded image from Cloudinary and clear the preview"
                    : "Clear the selected image preview"
                }
              >
                {isDeleting ? (
                  <LoaderCircle size={15} className="animate-spin" aria-hidden="true" />
                ) : (
                  <X size={15} aria-hidden="true" />
                )}
                {isDeleting
                  ? "Deleting…"
                  : uploadedAsset
                    ? historyRecordId
                      ? "Clear workspace"
                      : "Delete image"
                    : "Clear image"}
              </button>
            </div>
          ) : null}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            aria-label="Choose an image"
            onChange={handleInputChange}
          />
        </div>
        {preview && uploadedAsset ? (
          <p
            className="border-b border-line px-4 py-2 text-xs text-muted sm:px-5"
          >
            When you choose Remove background, Pixora sends this uploaded image to
            remove.bg. Both the original and processed PNG are retained in
            {user ? " your account history until deleted." : " guest history for 30 days."}
          </p>
        ) : null}
        {uploadedAsset ? (
          <div className="border-b border-line px-4 py-2 text-right text-xs text-emerald-300 sm:px-5">
            Uploaded and verified · {uploadedAsset.width} × {uploadedAsset.height} px ·{" "}
            {uploadedAsset.format.toUpperCase()}
          </div>
        ) : null}
        <div className="p-3 sm:p-5">
          {error ? (
            <div
              role="alert"
              className="mb-4 flex items-start gap-2 rounded-lg border border-rose-400/20 bg-rose-400/10 px-3 py-2.5 text-sm text-rose-200"
            >
              <AlertCircle size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
              <div>
                <p>{error}</p>
                {requiresAccount ? (
                  <p className="mt-2">
                    <Link
                      to="/register"
                      state={{
                        from: {
                          pathname: "/workspace",
                          state: historyRecordId
                            ? { historyId: historyRecordId }
                            : undefined,
                        },
                      }}
                      className="font-medium text-accent underline hover:text-accent-hover"
                    >
                      Create a free account
                    </Link>
                    {" · "}
                    <Link
                      to="/login"
                      state={{
                        from: {
                          pathname: "/workspace",
                          state: historyRecordId
                            ? { historyId: historyRecordId }
                            : undefined,
                        },
                      }}
                      className="font-medium text-accent underline hover:text-accent-hover"
                    >
                      Sign in
                    </Link>
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          {isPreparing ? (
            <p
              role="status"
              className="mb-4 flex items-center gap-2 rounded-lg border border-accent/20 bg-accent/10 px-3 py-2.5 text-sm text-accent"
            >
              <LoaderCircle size={17} className="animate-spin" aria-hidden="true" />
              Preparing a local preview…
            </p>
          ) : null}
          {isLoadingHistory ? (
            <p role="status" className="mb-4 flex items-center gap-2 text-sm text-muted">
              <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
              Reopening your saved image…
            </p>
          ) : null}
          {isUploading ? (
            <div
              role="status"
              className="mb-4 rounded-lg border border-accent/20 bg-accent/10 px-3 py-2.5 text-sm text-accent"
            >
              <div className="flex items-center justify-between gap-3">
                <span>Uploading original to Cloudinary…</span>
                <span>{uploadProgress}%</span>
              </div>
              <div
                className="mt-2 h-1.5 overflow-hidden rounded-full bg-canvas"
                role="progressbar"
                aria-label="Image upload progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={uploadProgress}
              >
                <div
                  className="h-full rounded-full bg-accent transition-[width]"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          ) : null}
          {isRemovingBackground ? (
            <p
              role="status"
              className="mb-4 flex items-center gap-2 rounded-lg border border-accent/20 bg-accent/10 px-3 py-2.5 text-sm text-accent"
            >
              <LoaderCircle size={17} className="animate-spin" aria-hidden="true" />
              Sending the uploaded image to remove.bg for processing…
            </p>
          ) : null}
          {isDeleting ? (
            <p role="status" className="mb-4 flex items-center gap-2 text-sm text-muted">
              <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
              Deleting the uploaded image from Cloudinary…
            </p>
          ) : null}
            {uploadedAsset ? (
            <p className="mb-4 rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-3 py-2.5 text-sm text-emerald-200">
              Original uploaded to Cloudinary and verified by the backend.
              {processedUrl
                ? " The transparent PNG is ready to download."
                : " Select Remove background to start AI processing."}
            </p>
          ) : null}

          {preview ? (
            <div className="workspace-preview">
              <BeforeAfterPreview
                preview={preview}
                processedUrl={processedUrl}
                canOpenEditor={canOpenEditor}
                isRemoving={isRemovingBackground}
                historyId={historyRecordId}
              />
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              <div
                className={`flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed px-5 py-10 text-center transition-colors sm:min-h-104 ${
                  isDragging
                    ? "border-accent bg-accent/10"
                    : "border-line bg-canvas hover:border-accent/50"
                }`}
                onDragEnter={(event) => {
                  event.preventDefault()
                  setIsDragging(true)
                }}
                onDragOver={(event) => event.preventDefault()}
                onDragLeave={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) {
                    setIsDragging(false)
                  }
                }}
                onDrop={handleDrop}
              >
                <span className="grid h-14 w-14 place-items-center rounded-2xl border border-line bg-surface text-accent">
                  <ImageUp size={24} aria-hidden="true" />
                </span>
                <h3 className="mt-5 text-lg font-medium text-ink">
                  Drop an image to get started
                </h3>
                <p className="mt-2 max-w-sm text-sm leading-6 text-muted">
                  Or choose a file from your device. Your image is only previewed
                  in this browser tab.
                </p>
                <button
                  type="button"
                  className={buttonClasses("primary", "mt-5")}
                  onClick={chooseFile}
                >
                  Choose an image
                </button>
                <p className="mt-4 text-xs text-muted">
                  JPG, PNG, or WEBP · Up to 10 MB
                </p>
              </div>

              <div className="checkerboard flex min-h-72 items-center justify-center rounded-xl border border-line p-5 text-center sm:min-h-104">
                <div className="max-w-xs rounded-xl border border-line bg-canvas/90 p-6 backdrop-blur-sm">
                  <h3 className="text-sm font-medium text-ink">Cutout preview</h3>
                  <p className="mt-2 text-xs leading-5 text-muted">
                    Upload an image, then choose Remove background to create a
                    transparent PNG.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <p className="mt-4 text-center text-xs leading-5 text-muted">
        {user
          ? "Account image history is stored in MongoDB and Cloudinary until deleted. "
          : "Guest image history is stored in MongoDB and Cloudinary for 30 days. "}
        Clear the workspace to leave history intact, or delete the image from the
        History page to remove its assets.
      </p>
    </Container>
  )
}

function getErrorMessage(error, fallback) {
  const responseData = error?.response?.data
  const responseError = responseData?.error ?? responseData?.message
  if (typeof responseError === "string") return responseError
  if (typeof responseError?.message === "string") return responseError.message
  if (typeof error?.message === "string") return error.message
  return fallback
}
