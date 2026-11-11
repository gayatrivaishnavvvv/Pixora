import { Link } from "react-router-dom"
import Container from "../ui/Container"
import Logo from "./Logo"

const year = new Date().getFullYear()

const columns = [
  {
    title: "Product",
    links: [
      { label: "Features", to: "/#features" },
      { label: "How it works", to: "/#how-it-works" },
      { label: "Pricing", to: "/pricing" },
      { label: "Workspace", to: "/workspace" },
    ],
  },
  {
    title: "Library",
    links: [{ label: "History", to: "/history" }],
  },
]

export default function Footer() {
  return (
    <footer className="border-t border-line bg-surface/75 backdrop-blur-sm">
      <Container className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-6 text-muted">
            Remove backgrounds. Create possibilities. A workspace for clean
            product cutouts.
          </p>
        </div>
        {columns.map((column) => (
          <div key={column.title}>
            <p className="text-sm font-medium text-ink">{column.title}</p>
            <ul className="mt-4 space-y-3">
              {column.links.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm text-muted transition-colors hover:text-ink"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Container>
      <div className="border-t border-line">
        <Container className="flex flex-col gap-2 py-5 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} PIXORA</p>
          <p>Photos dropped on the home page are not uploaded.</p>
        </Container>
      </div>
    </footer>
  )
}
