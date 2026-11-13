import { Router } from "express"
import { createHistoryController } from "../controllers/history.controller.js"
import { requireHistoryOwner } from "../middleware/requireAuthentication.js"

export function createHistoryRouter(
  config,
  cloudinaryClient,
  imageModel,
  fetchImage,
  userModel,
) {
  const router = Router()
  const controller = createHistoryController(
    imageModel,
    cloudinaryClient,
    config,
    fetchImage,
  )
  const historyOwner = requireHistoryOwner(
    config.authSessionSecret,
    config.uploadSessionSecret,
    userModel,
  )

  router.use(historyOwner)
  router.get("/", controller.list)
  router.post("/", controller.create)
  router.get("/:id/assets/:kind", controller.getAsset)
  router.get("/:id", controller.get)
  router.patch("/:id/processed", controller.completeProcessing)
  router.patch("/:id/settings", controller.updateSettings)
  router.delete("/:id", controller.remove)

  return router
}
