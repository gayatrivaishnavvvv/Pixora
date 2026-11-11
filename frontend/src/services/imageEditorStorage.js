const SETTINGS_KEY = "pixora.image-editor.settings.v1"
const DATABASE_NAME = "pixora-image-editor"
const DATABASE_VERSION = 2
const BACKGROUND_STORE = "backgrounds"
const BACKGROUND_KEY = "custom-background"
const PROCESSED_STORE = "processed"
const PROCESSED_KEY = "latest-cutout"

export const DEFAULT_EDITING_SETTINGS = {
  backgroundMode: "transparent",
  backgroundColor: "#ffffff",
  presetId: "warm",
  positionX: 50,
  positionY: 50,
  scale: 100,
  exportFormat: "png",
}

export const BACKGROUND_PRESETS = [
  { id: "warm", name: "Warm", colors: ["#f6d7b0", "#d99c78"] },
  { id: "sky", name: "Sky", colors: ["#c4e7f7", "#7bb6dc"] },
  { id: "sage", name: "Sage", colors: ["#d9e8d1", "#8ba88b"] },
  { id: "lavender", name: "Lavender", colors: ["#e8ddff", "#ab96de"] },
]

const BACKGROUND_MODES = ["transparent", "color", "preset", "image"]
const EXPORT_FORMATS = ["png", "jpeg", "webp"]

export function normalizeEditingSettings(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...DEFAULT_EDITING_SETTINGS }
  }

  const presetId = BACKGROUND_PRESETS.some((preset) => preset.id === value.presetId)
    ? value.presetId
    : DEFAULT_EDITING_SETTINGS.presetId

  return {
    backgroundMode: BACKGROUND_MODES.includes(value.backgroundMode)
      ? value.backgroundMode
      : DEFAULT_EDITING_SETTINGS.backgroundMode,
    backgroundColor:
      typeof value.backgroundColor === "string" &&
      /^#[0-9a-f]{6}$/i.test(value.backgroundColor)
        ? value.backgroundColor
        : DEFAULT_EDITING_SETTINGS.backgroundColor,
    presetId,
    positionX: normalizeNumber(value.positionX, 0, 100, 50),
    positionY: normalizeNumber(value.positionY, 0, 100, 50),
    scale: normalizeNumber(value.scale, 25, 200, 100),
    exportFormat: EXPORT_FORMATS.includes(value.exportFormat)
      ? value.exportFormat
      : DEFAULT_EDITING_SETTINGS.exportFormat,
  }
}

function normalizeNumber(value, min, max, fallback) {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback
}

export function loadEditingSettings() {
  const storedSettings = window.localStorage.getItem(SETTINGS_KEY)
  return storedSettings
    ? normalizeEditingSettings(JSON.parse(storedSettings))
    : { ...DEFAULT_EDITING_SETTINGS }
}

export function saveEditingSettings(settings) {
  window.localStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify(normalizeEditingSettings(settings)),
  )
}

function openBackgroundDatabase() {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(BACKGROUND_STORE)) {
        database.createObjectStore(BACKGROUND_STORE)
      }
      if (!database.objectStoreNames.contains(PROCESSED_STORE)) {
        database.createObjectStore(PROCESSED_STORE)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function saveCustomBackground(file) {
  const database = await openBackgroundDatabase()
  try {
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(BACKGROUND_STORE, "readwrite")
      transaction.objectStore(BACKGROUND_STORE).put(file, BACKGROUND_KEY)
      transaction.oncomplete = resolve
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () => reject(transaction.error)
    })
  } finally {
    database.close()
  }
}

export async function loadCustomBackground() {
  const database = await openBackgroundDatabase()
  try {
    return await new Promise((resolve, reject) => {
      const request = database
        .transaction(BACKGROUND_STORE, "readonly")
        .objectStore(BACKGROUND_STORE)
        .get(BACKGROUND_KEY)
      request.onsuccess = () => resolve(request.result ?? null)
      request.onerror = () => reject(request.error)
    })
  } finally {
    database.close()
  }
}

export async function clearCustomBackground() {
  const database = await openBackgroundDatabase()
  try {
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(BACKGROUND_STORE, "readwrite")
      transaction.objectStore(BACKGROUND_STORE).delete(BACKGROUND_KEY)
      transaction.oncomplete = resolve
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () => reject(transaction.error)
    })
  } finally {
    database.close()
  }
}

export async function saveProcessedCutout(blob, imageName) {
  const database = await openBackgroundDatabase()
  try {
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(PROCESSED_STORE, "readwrite")
      transaction.objectStore(PROCESSED_STORE).put(
        { blob, imageName },
        PROCESSED_KEY,
      )
      transaction.oncomplete = resolve
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () => reject(transaction.error)
    })
  } finally {
    database.close()
  }
}

export async function loadProcessedCutout() {
  const database = await openBackgroundDatabase()
  try {
    return await new Promise((resolve, reject) => {
      const request = database
        .transaction(PROCESSED_STORE, "readonly")
        .objectStore(PROCESSED_STORE)
        .get(PROCESSED_KEY)
      request.onsuccess = () => resolve(request.result ?? null)
      request.onerror = () => reject(request.error)
    })
  } finally {
    database.close()
  }
}

export async function clearProcessedCutout() {
  const database = await openBackgroundDatabase()
  try {
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(PROCESSED_STORE, "readwrite")
      transaction.objectStore(PROCESSED_STORE).delete(PROCESSED_KEY)
      transaction.oncomplete = resolve
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () => reject(transaction.error)
    })
  } finally {
    database.close()
  }
}
