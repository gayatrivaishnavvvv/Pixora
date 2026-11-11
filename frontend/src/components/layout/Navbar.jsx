import { Menu, X } from "lucide-react"
import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { buttonClasses } from "../ui/buttonClasses"
import Container from "../ui/Container"
import Logo from "./Logo"

const links = [
  { label: "Features", to: "/#features" },
  { label: "How it works", to: "/#how-it-works" },
  { label: "Pricing", to: "/pricing" },
  { label: "History", to: "/history" },
]

function isActive(pathname, hash, to) {
  if (to.startsWith("/#")) {
    return pathname === "/" && hash === `#${to.slice(2)}`
  }
  return pathname === to
}

function NavLinks({ pathname, hash, onNavigate, className }) {
  return (
    <nav className={className} aria-label="Primary">
      {links.map((link) => {
        const active = isActive(pathname, hash, link.to)
        return (
          <Link
            key={link.to}
            to={link.to}
            onClick={onNavigate}
            className={`text-sm font-medium transition-colors ${
              active ? "text-ink" : "text-muted hover:text-ink"
            }`}
            aria-current={active ? "page" : undefined}
          >
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}

export default function Navbar() {
  const { pathname, hash } = useLocation()
  const locationKey = `${pathname}${hash}`
  const [menu, setMenu] = useState({ key: locationKey, open: false })
  const open = menu.key === locationKey && menu.open

  function toggleMenu() {
    setMenu({ key: locationKey, open: !open })
  }

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas/90 backdrop-blur-xl">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Logo />
        <NavLinks
          pathname={pathname}
          hash={hash}
          className="hidden items-center gap-7 md:flex"
        />
        <div className="flex items-center gap-2">
          <Link to="/workspace" className={buttonClasses("primary")}>
            Workspace
          </Link>
          <button
            type="button"
            className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-line bg-surface text-ink transition-colors hover:border-accent/50 md:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={toggleMenu}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
            <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          </button>
        </div>
      </Container>
      {open ? (
        <div id="mobile-nav" className="border-t border-line md:hidden">
          <Container className="flex flex-col gap-4 py-4">
            <NavLinks
              pathname={pathname}
              hash={hash}
              onNavigate={() => setMenu({ key: locationKey, open: false })}
              className="flex flex-col gap-3"
            />
          </Container>
        </div>
      ) : null}
    </header>
  )
}
