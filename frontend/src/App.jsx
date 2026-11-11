import { BrowserRouter, Route, Routes } from "react-router-dom"
import SiteLayout from "./components/layout/SiteLayout"
import LandingPage from "./pages/LandingPage"
import ImageEditorPage from "./pages/ImageEditorPage"
import NotFoundPage from "./pages/NotFoundPage"
import PricingPage from "./pages/PricingPage"
import WorkspacePage from "./pages/WorkspacePage"
import UpcomingPage from "./pages/UpcomingPage"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<SiteLayout />}>
          <Route index element={<LandingPage />} />
          <Route path="pricing" element={<PricingPage />} />
          <Route path="workspace" element={<WorkspacePage />} />
          <Route path="editor" element={<ImageEditorPage />} />
          <Route path="history" element={<UpcomingPage page="history" />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
