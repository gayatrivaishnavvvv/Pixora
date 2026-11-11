import { Link } from "react-router-dom"

export default function Logo() {
  return (
    <Link to="/" className="group flex items-center gap-2.5" aria-label="PIXORA home">
      <img
        src="/pixora-mark.svg"
        alt=""
        className="h-9 w-9 transition-transform duration-200 group-hover:scale-105"
      />
      <span className="text-[15px] font-semibold tracking-[0.16em] text-ink">
        PIXORA
      </span>
    </Link>
  )
}
