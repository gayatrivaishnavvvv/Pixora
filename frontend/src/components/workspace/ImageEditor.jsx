import { useEffect, useState } from "react"
import {
  Download,
  ImageIcon,
  ImagePlus,
  RotateCcw,
  Scaling,
} from "lucide-react"
import { buttonClasses } from "../ui/buttonClasses"
import {
  BACKGROUND_PRESETS,
  DEFAULT_EDITING_SETTINGS,
  clearCustomBackground,
  loadCustomBackground,
  loadEditingSettings,
  normalizeEditingSettings,
  saveCustomBackground,
  saveEditingSettings,
} from "../../services/imageEditorStorage"
import { saveHistorySettings } from "../../services/uploadApi"

const MAX_BACKGROUND_SIZE = 10 * 1024 * 1024
const ACCEPTED_BACKGROUND_TYPES = ["image/jpeg", "image/png", "image/webp"]

export default function ImageEditor({ processedUrl, imageName, historyId, onError }) {
  const [settings, setSettings] = useState(DEFAULT_EDITING_SETTINGS)
  const [customBackground, setCustomBackground] = useState(null)
  const [imageSize, setImageSize] = useState(null)
  const [isReady, setIsReady] = useState(false)
  const [hasChanged, setHasChanged] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [backgroundInputKey, setBackgroundInputKey] = useState(0)

  useEffect(() => {
    let active = true

    async function restoreSettings() {
      let restoredSettings = { ...DEFAULT_EDITING_SETTINGS }
      let restoreError = ""

      try {
        restoredSettings = loadEditingSettings()
      } catch {
        restoreError =
          "Saved editing settings could not be read. Default settings are being used."
      }

      try {
        const savedBackground = await loadCustomBackground()
        if (!active) return

        if (savedBackground) {
          setCustomBackground({
            name: savedBackground.name ?? "Saved background",
            url: URL.createObjectURL(savedBackground),
          })
        } else if (restoredSettings.backgroundMode === "image") {
          restoredSettings = {
            ...restoredSettings,
            backgroundMode: "transparent",
          }
          restoreError =
            "The saved background image is unavailable. Switched to transparent."
        }
      } catch {
        if (restoredSettings.backgroundMode === "image") {
          restoredSettings = {
            ...restoredSettings,
            backgroundMode: "transparent",
          }
        }
        restoreError =
          "The saved background image could not be loaded from this browser."
      }

      if (!active) return
      setSettings(normalizeEditingSettings(restoredSettings))
      setHasChanged(false)
      setIsReady(true)
      if (restoreError) onError(restoreError)
    }

    restoreSettings()
    return () => {
      active = false
    }
  }, [onError])

  useEffect(() => {
    if (!isReady) return

    try {
      saveEditingSettings(settings)
    } catch {
      onError("Editing settings could not be saved in this browser.")
    }
  }, [isReady, onError, settings])

  useEffect(() => {
    if (!isReady || !hasChanged || !historyId) return
    const timer = window.setTimeout(() => {
      saveHistorySettings(historyId, settings).catch(() => {
        onError("Editing settings could not be saved to image history.")
      })
    }, 500)
    return () => window.clearTimeout(timer)
  }, [hasChanged, historyId, isReady, onError, settings])

  useEffect(() => {
    return () => {
      if (customBackground?.url) URL.revokeObjectURL(customBackground.url)
    }
  }, [customBackground?.url])

  useEffect(() => {
    let active = true
    loadImage(processedUrl)
      .then((image) => {
        if (active) {
          setImageSize({ width: image.naturalWidth, height: image.naturalHeight })
        }
      })
      .catch(() => {
        if (active) onError("The processed image could not be opened for editing.")
      })

    return () => {
      active = false
    }
  }, [onError, processedUrl])

  function updateSettings(changes) {
    setHasChanged(true)
    setSettings((current) => ({ ...current, ...changes }))
  }

  async function handleBackgroundFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    onError("")

    if (!ACCEPTED_BACKGROUND_TYPES.includes(file.type)) {
      onError("Choose a JPG, PNG, or WEBP background image.")
      return
    }
    if (file.size > MAX_BACKGROUND_SIZE) {
      onError("The background image must be 10 MB or smaller.")
      return
    }

    const url = URL.createObjectURL(file)
    try {
      await loadImage(url)
    } catch {
      URL.revokeObjectURL(url)
      onError("This background file could not be opened as an image.")
      return
    }

    setCustomBackground({ name: file.name, url })
    updateSettings({ backgroundMode: "image" })
    try {
      await saveCustomBackground(file)
    } catch {
      onError(
        "The background is available now, but this browser could not save it for later.",
      )
    }
  }

  async function resetEditor() {
    onError("")
    setSettings({ ...DEFAULT_EDITING_SETTINGS })
    setHasChanged(true)
    setCustomBackground(null)
    setBackgroundInputKey((key) => key + 1)
    try {
      await clearCustomBackground()
    } catch {
      onError("Settings were reset, but the saved background image could not be cleared.")
    }
  }

  async function downloadImage() {
    if (!imageSize || isExporting) return

    onError("")
    setIsExporting(true)
    try {
      const foreground = await loadImage(processedUrl)
      const canvas = document.createElement("canvas")
      canvas.width = foreground.naturalWidth
      canvas.height = foreground.naturalHeight
      const context = canvas.getContext("2d")
      if (!context) {
        throw new Error("This browser could not create an image for download.")
      }

      if (
        settings.backgroundMode === "transparent" &&
        settings.exportFormat === "jpeg"
      ) {
        context.fillStyle = "#ffffff"
        context.fillRect(0, 0, canvas.width, canvas.height)
      } else {
        await drawBackground(context, canvas, settings, customBackground?.url)
      }

      const fitScale = Math.min(
        canvas.width / foreground.naturalWidth,
        canvas.height / foreground.naturalHeight,
      )
      const scale = fitScale * (settings.scale / 100)
      const width = foreground.naturalWidth * scale
      const height = foreground.naturalHeight * scale
      const centerX = (canvas.width * settings.positionX) / 100
      const centerY = (canvas.height * settings.positionY) / 100

      context.drawImage(
        foreground,
        centerX - width / 2,
        centerY - height / 2,
        width,
        height,
      )

      const mimeType = `image/${settings.exportFormat}`
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (result) =>
            result
              ? resolve(result)
              : reject(new Error("The browser could not export this image.")),
          mimeType,
          0.92,
        )
      })
      if (blob.type !== mimeType) {
        throw new Error(`This browser cannot export ${settings.exportFormat.toUpperCase()} images.`)
      }
      const downloadUrl = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = downloadUrl
      anchor.download = `${getBaseName(imageName)}-edited.${getExtension(settings.exportFormat)}`
      document.body.append(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000)
    } catch (exportError) {
      onError(
        exportError instanceof Error
          ? exportError.message
          : "The edited image could not be exported.",
      )
    } finally {
      setIsExporting(false)
    }
  }

  const selectedPreset = BACKGROUND_PRESETS.find(
    (preset) => preset.id === settings.presetId,
  )

  return (
    <div className="space-y-4 p-3 sm:p-4">
      <div
        className="checkerboard relative mx-auto flex max-h-[26rem] w-full max-w-[42rem] items-center justify-center overflow-hidden rounded-lg border border-line"
        style={{
          aspectRatio: imageSize ? `${imageSize.width} / ${imageSize.height}` : "4 / 3",
          background:
            settings.backgroundMode === "color"
              ? settings.backgroundColor
              : settings.backgroundMode === "preset"
                ? `linear-gradient(135deg, ${selectedPreset?.colors.join(", ")})`
                : settings.backgroundMode === "image" && customBackground
                  ? `center / cover no-repeat url("${customBackground.url}")`
                  : undefined,
        }}
      >
        <img
          src={processedUrl}
          alt={`Editable transparent cutout of ${imageName}`}
          className="absolute max-w-none object-contain"
          style={{
            left: `${settings.positionX}%`,
            top: `${settings.positionY}%`,
            width: `${settings.scale}%`,
            transform: "translate(-50%, -50%)",
          }}
        />
      </div>

      {!isReady ? (
        <p role="status" className="text-xs text-muted">
          Loading saved editing settings…
        </p>
      ) : null}
      <fieldset
        disabled={!isReady}
        className="grid gap-4 rounded-lg border border-line bg-canvas/70 p-4 disabled:opacity-60"
      >
        <div>
          <h3 className="flex items-center gap-2 text-sm font-medium text-ink">
            <ImageIcon size={16} aria-hidden="true" />
            Background
          </h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              ["transparent", "Transparent"],
              ["color", "Color"],
              ["preset", "Presets"],
              ["image", "Image"],
            ].map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                aria-pressed={settings.backgroundMode === mode}
                className={buttonClasses(
                  settings.backgroundMode === mode ? "primary" : "secondary",
                  "px-3 py-2 text-xs",
                )}
                onClick={() => updateSettings({ backgroundMode: mode })}
              >
                {label}
              </button>
            ))}
          </div>

          {settings.backgroundMode === "color" ? (
            <label className="mt-3 flex items-center gap-3 text-xs text-muted">
              Background color
              <input
                type="color"
                value={settings.backgroundColor}
                aria-label="Background color"
                className="h-9 w-12 cursor-pointer rounded border border-line bg-surface p-1"
                onChange={(event) =>
                  updateSettings({ backgroundColor: event.target.value })
                }
              />
              <span>{settings.backgroundColor.toUpperCase()}</span>
            </label>
          ) : null}

          {settings.backgroundMode === "preset" ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {BACKGROUND_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  aria-pressed={settings.presetId === preset.id}
                  className={`h-10 min-w-20 rounded-md border px-3 text-xs font-medium text-slate-900 ${
                    settings.presetId === preset.id
                      ? "border-white ring-2 ring-accent"
                      : "border-line"
                  }`}
                  style={{
                    background: `linear-gradient(135deg, ${preset.colors.join(", ")})`,
                  }}
                  onClick={() => updateSettings({ presetId: preset.id })}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          ) : null}

          {settings.backgroundMode === "image" ? (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <input
                key={backgroundInputKey}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                id="custom-background-image"
                onChange={handleBackgroundFile}
              />
              <label
                htmlFor="custom-background-image"
                className={buttonClasses("secondary", "cursor-pointer px-3 py-2 text-xs")}
              >
                <ImagePlus size={14} aria-hidden="true" />
                Choose background image
              </label>
              <span className="max-w-full truncate text-xs text-muted">
                {customBackground?.name ?? "No custom background selected"}
              </span>
            </div>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-xs text-muted">
            <span className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Scaling size={14} aria-hidden="true" />
                Scale
              </span>
              <span>{settings.scale}%</span>
            </span>
            <input
              type="range"
              min="25"
              max="200"
              value={settings.scale}
              aria-label="Cutout scale"
              className="mt-2 w-full accent-accent"
              onChange={(event) =>
                updateSettings({ scale: Number(event.target.value) })
              }
            />
          </label>
          <label className="block text-xs text-muted">
            <span className="flex items-center justify-between">
              <span>Horizontal position</span>
              <span>{settings.positionX}%</span>
            </span>
            <input
              type="range"
              min="0"
              max="100"
              value={settings.positionX}
              aria-label="Horizontal position"
              className="mt-2 w-full accent-accent"
              onChange={(event) =>
                updateSettings({ positionX: Number(event.target.value) })
              }
            />
          </label>
          <label className="block text-xs text-muted sm:col-span-2">
            <span className="flex items-center justify-between">
              <span>Vertical position</span>
              <span>{settings.positionY}%</span>
            </span>
            <input
              type="range"
              min="0"
              max="100"
              value={settings.positionY}
              aria-label="Vertical position"
              className="mt-2 w-full accent-accent"
              onChange={(event) =>
                updateSettings({ positionY: Number(event.target.value) })
              }
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <button
            type="button"
            className={buttonClasses("secondary", "px-3 py-2 text-xs")}
            onClick={resetEditor}
          >
            <RotateCcw size={14} aria-hidden="true" />
            Reset edits
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="export-format">
              Export format
            </label>
            <select
              id="export-format"
              value={settings.exportFormat}
              className="rounded-md border border-line bg-surface px-3 py-2 text-xs text-ink"
              onChange={(event) =>
                updateSettings({ exportFormat: event.target.value })
              }
            >
              <option value="png">PNG</option>
              <option value="jpeg">JPG</option>
              <option value="webp">WebP</option>
            </select>
            <button
              type="button"
              disabled={!imageSize || isExporting}
              className={buttonClasses(
                "primary",
                "px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50",
              )}
              onClick={downloadImage}
            >
              <Download size={14} aria-hidden="true" />
              {isExporting ? "Exporting…" : "Download"}
            </button>
          </div>
        </div>
        <p className="text-xs leading-5 text-muted">
          Editing settings and your custom background are saved in this browser.
          Background changes use the existing cutout; AI processing is not rerun.
          PNG and WebP preserve transparency when no background is selected. JPG
          exports use white behind transparent areas.
        </p>
      </fieldset>
    </div>
  )
}

function drawBackground(context, canvas, settings, customBackgroundUrl) {
  if (settings.backgroundMode === "color") {
    context.fillStyle = settings.backgroundColor
    context.fillRect(0, 0, canvas.width, canvas.height)
  } else if (settings.backgroundMode === "preset") {
    const preset = BACKGROUND_PRESETS.find(
      (item) => item.id === settings.presetId,
    )
    const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height)
    gradient.addColorStop(0, preset.colors[0])
    gradient.addColorStop(1, preset.colors[1])
    context.fillStyle = gradient
    context.fillRect(0, 0, canvas.width, canvas.height)
  } else if (settings.backgroundMode === "image" && customBackgroundUrl) {
    return loadImage(customBackgroundUrl).then((image) => {
      const scale = Math.max(
        canvas.width / image.naturalWidth,
        canvas.height / image.naturalHeight,
      )
      const width = image.naturalWidth * scale
      const height = image.naturalHeight * scale
      context.drawImage(
        image,
        (canvas.width - width) / 2,
        (canvas.height - height) / 2,
        width,
        height,
      )
    })
  }

  return Promise.resolve()
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("Image could not be loaded."))
    image.src = source
  })
}

function getBaseName(filename) {
  return filename.replace(/\.[^.]+$/, "") || "pixora-image"
}

function getExtension(format) {
  return format === "jpeg" ? "jpg" : format
}
