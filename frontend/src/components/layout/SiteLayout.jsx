import { useEffect } from "react"
import { Outlet, useLocation } from "react-router-dom"
import Footer from "./Footer"
import Navbar from "./Navbar"

export default function SiteLayout() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      })
      return
    }
    window.scrollTo(0, 0)
  }, [pathname, hash])

  return (
    <div className="site-shell flex min-h-svh flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
