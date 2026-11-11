import { useState } from "react"

function StillLife({ shadow }) {
  return (
    <svg
      viewBox="0 0 640 520"
      className="h-full w-full"
      role="img"
      aria-label={
        shadow
          ? "Illustrated bottle on a studio surface"
          : "Illustrated bottle with the surface removed"
      }
    >
      {shadow ? (
        <ellipse cx="320" cy="438" rx="132" ry="16" fill="#171923" opacity="0.12" />
      ) : null}
      <g fill="#F7F4EF" stroke="#171923" strokeWidth="2.5" strokeLinejoin="round">
        <rect x="292" y="92" width="56" height="28" rx="4" />
        <path d="M304 120h32l10 36H294z" />
        <rect x="246" y="154" width="148" height="236" rx="22" />
      </g>
      <rect x="266" y="246" width="108" height="72" rx="4" fill="#171923" />
      <path
        d="M284 270h72M284 286h48"
        stroke="#F7F4EF"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  )
}

export default function ComparisonSlider() {
  const [position, setPosition] = useState(58)
  const [focused, setFocused] = useState(false)

  return (
    <figure>
      <div className="panel-shadow relative aspect-[16/10] overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="checkerboard absolute inset-0">
          <StillLife shadow={false} />
        </div>
        <div
          className="absolute inset-0"
          style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        >
          <div className="relative h-full w-full bg-[#34323d]">
            <div className="absolute inset-x-0 top-0 h-2/3 bg-[#46434f]" />
            <StillLife shadow />
          </div>
        </div>

        <div
          className="pointer-events-none absolute inset-y-0 z-10 w-px bg-white"
          style={{ left: `${position}%` }}
        />
        <div
          className={`pointer-events-none absolute top-1/2 z-10 grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-line bg-surface shadow-lg ${
            focused ? "outline-2 outline-offset-2 outline-accent" : ""
          }`}
          style={{ left: `${position}%` }}
          aria-hidden="true"
        >
          <span className="flex gap-1">
            <span className="h-3 w-px bg-muted" />
            <span className="h-3 w-px bg-muted" />
          </span>
        </div>

        <span className="pointer-events-none absolute top-3 left-3 z-10 rounded-md bg-surface px-2 py-1 text-xs font-medium text-ink">
          Original
        </span>
        <span className="pointer-events-none absolute top-3 right-3 z-10 rounded-md bg-surface px-2 py-1 text-xs font-medium text-ink">
          Cutout
        </span>

        <label className="absolute inset-0 z-20 cursor-ew-resize">
          <span className="sr-only">Drag to compare the original and the cutout</span>
          <input
            type="range"
            min="2"
            max="98"
            value={position}
            aria-valuetext={`${position} percent original`}
            onChange={(event) => setPosition(Number(event.target.value))}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
          />
        </label>
      </div>
      <figcaption className="mt-3 text-center text-sm text-muted">
        Drag the handle. This bottle is an illustration of the comparison view,
        not a photo from your library.
      </figcaption>
    </figure>
  )
}
