import { BrowserRouter, Route, Routes } from "react-router-dom"
import ProtectedRoute from "./components/auth/ProtectedRoute"
import SiteLayout from "./components/layout/SiteLayout"
import { AuthProvider } from "./contexts/AuthContext.jsx"
import DashboardPage from "./pages/DashboardPage"
import LandingPage from "./pages/LandingPage"
import HistoryPage from "./pages/HistoryPage"
import ImageEditorPage from "./pages/ImageEditorPage"
import LoginPage from "./pages/auth/LoginPage"
import NotFoundPage from "./pages/NotFoundPage"
import PricingPage from "./pages/PricingPage"
import ProfilePage from "./pages/ProfilePage"
import RegisterPage from "./pages/auth/RegisterPage"
import WorkspacePage from "./pages/WorkspacePage"

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<SiteLayout />}>
            <Route index element={<LandingPage />} />
            <Route path="pricing" element={<PricingPage />} />
            <Route path="workspace" element={<WorkspacePage />} />
            <Route path="editor" element={<ImageEditorPage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
            <Route element={<ProtectedRoute />}>
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
