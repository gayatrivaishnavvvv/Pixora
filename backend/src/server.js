import { configureCloudinary } from "./config/cloudinary.js"
import { connectDatabase } from "./config/database.js"
import { getServerConfig } from "./config/env.js"
import { Image } from "./models/Image.js"
import { startGuestHistoryCleanup } from "./services/guestHistoryCleanup.service.js"
import { createApp } from "./app.js"

async function startServer() {
  const config = getServerConfig()
  const cloudinaryClient = configureCloudinary(config.cloudinary)
  await connectDatabase(config.mongoUri)
  startGuestHistoryCleanup(Image, cloudinaryClient)

  const app = createApp(config, cloudinaryClient)
  app.listen(config.port, () => {
    console.log(`PIXORA API listening at http://localhost:${config.port}`)
  })
}

startServer().catch((error) => {
  console.error("Could not start PIXORA API:", error.message)
  process.exitCode = 1
})
