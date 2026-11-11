import { createInterface } from "node:readline/promises"
import { stdin, stdout } from "node:process"
import { fileURLToPath } from "node:url"
import path from "node:path"
import dotenv from "dotenv"

const adminApiKey = process.env.CLOUDINARY_PERMISSION_ADMIN_API_KEY?.trim()
const adminApiSecret = process.env.CLOUDINARY_PERMISSION_ADMIN_API_SECRET?.trim()
const backendDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
)
const envPath = path.join(backendDirectory, ".env")
const envResult = dotenv.config({ path: envPath, quiet: true })

if (envResult.error) {
  throw new Error("Could not load backend/.env.")
}

function getRequiredEnv(name) {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

const cloudName = getRequiredEnv("CLOUDINARY_CLOUD_NAME")
if (!adminApiKey || !adminApiSecret) {
  throw new Error(
    "Set CLOUDINARY_PERMISSION_ADMIN_API_KEY and CLOUDINARY_PERMISSION_ADMIN_API_SECRET in the current shell. Do not add temporary admin credentials to backend/.env.",
  )
}

const apiBaseUrl = `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}`
const authorization = `Basic ${Buffer.from(`${adminApiKey}:${adminApiSecret}`).toString("base64")}`

async function requestCloudinary(pathname, { method = "GET", body } = {}) {
  const response = await fetch(`${apiBaseUrl}/${pathname}`, {
    method,
    headers: {
      Authorization: authorization,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })

  const data = await response.json()

  if (!response.ok) {
    const message =
      typeof data?.error?.message === "string"
        ? data.error.message
        : `Cloudinary returned HTTP ${response.status}.`
    throw new Error(message)
  }

  return data
}

const folderList = await requestCloudinary("folders/pixora")
const guestFolder = folderList.folders?.find(
  (folder) => folder.path === "pixora/guest",
)

if (!guestFolder?.external_id) {
  throw new Error(
    "Cloudinary did not return the pixora/guest folder. Check the folder path and environment.",
  )
}

console.log("Planned Cloudinary permission change:")
console.log(`  Product environment: ${cloudName}`)
console.log("  Folder: pixora/guest")
console.log("  API key: temporary permission-management key (value hidden)")
console.log("  Role: Contributor (folder-level; allows adding assets)")

if (!process.argv.includes("--apply")) {
  console.log("\nDry run only. No Cloudinary permissions were changed.")
  console.log("To apply, rerun with --apply and type APPLY when prompted.")
  process.exit(0)
}

const prompt = createInterface({ input: stdin, output: stdout })
const confirmation = await prompt.question(
  "\nType APPLY to grant this folder role to the configured API key: ",
)
prompt.close()

if (confirmation !== "APPLY") {
  console.log("Cancelled. No Cloudinary permissions were changed.")
  process.exit(0)
}

const result = await requestCloudinary(
  `folder_operations/invite/${encodeURIComponent(guestFolder.external_id)}`,
  {
    method: "POST",
    body: {
      principal: { id: getRequiredEnv("CLOUDINARY_API_KEY"), type: "apiKey" },
      operation: "add",
      roles: ["cld::role::folder::contributor"],
    },
  },
)

if (result.success !== true) {
  throw new Error("Cloudinary did not confirm the permission change.")
}

console.log("Cloudinary confirmed the folder role assignment.")
