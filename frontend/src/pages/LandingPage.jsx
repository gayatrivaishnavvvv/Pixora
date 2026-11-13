import {
  ArrowDown,
  ArrowRight,
  Columns2,
  FolderClock,
  Layers,
  Move,
  ScanLine,
  ShieldCheck,
} from "lucide-react"
import ComparisonSlider from "../components/landing/ComparisonSlider"
import FaqList from "../components/landing/FaqList"
import UploadPreview from "../components/landing/UploadPreview"
import { buttonClasses } from "../components/ui/buttonClasses"
import Container from "../components/ui/Container"

const steps = [
  {
    number: "01",
    title: "Choose an image",
    text: "Choose a JPG, PNG, or WEBP in Workspace. The landing-page preview remains local until you open the workspace.",
  },
  {
    number: "02",
    title: "Remove the background",
    text: "Workspace sends the verified original to remove.bg and stores the resulting transparent cutout in your history.",
  },
  {
    number: "03",
    title: "Make it yours",
    text: "Set a new background, compare the result, and export your edit from the workspace.",
  },
]

const features = [
  {
    icon: ScanLine,
    title: "A clean transparent cutout",
    text: "Remove the background in Workspace to create a transparent PNG, ready to use on a new background.",
  },
  {
    icon: Layers,
    title: "Backgrounds that fit",
    text: "Choose a solid color, a preset, or your own image for the scene behind your subject.",
  },
  {
    icon: Move,
    title: "Simple placement controls",
    text: "Adjust scale and position, then reset the subject without starting over.",
  },
  {
    icon: Columns2,
    title: "A useful before-and-after",
    text: "Compare the original with the cutout before you decide what to export.",
  },
  {
    icon: FolderClock,
    title: "Pick up where you left off",
    text: "Open History to return to a saved original and cutout, then continue editing without another upload.",
  },
  {
    icon: ShieldCheck,
    title: "Storage with clear boundaries",
    text: "Guests can process two images per session. Create an account to process more and keep your history.",
  },
]

export default function LandingPage() {
  return (
    <>
      <section className="hero-section relative overflow-hidden border-b border-line">
        <Container className="hero-intro grid items-center gap-12 py-14 sm:py-20 lg:grid-cols-[0.92fr_1.08fr] lg:gap-10 lg:py-24">
          <div className="hero-copy relative z-10 text-center lg:text-left">
            <p className="hero-eyebrow mx-auto inline-flex items-center gap-2 rounded-full border border-line bg-surface/80 px-3 py-1.5 text-xs font-medium tracking-wide text-muted backdrop-blur-sm lg:mx-0">
              <span className="hero-status-dot h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
              A FRESH CANVAS FOR EVERY IMAGE
            </p>
            <h1 className="hero-title mx-auto mt-6 max-w-2xl text-4xl font-semibold leading-[1.08] tracking-tight text-ink sm:text-6xl lg:mx-0 lg:text-7xl">
              Make your subject
              <span className="hero-title-accent block">the whole picture.</span>
            </h1>
            <p className="hero-description mx-auto mt-5 max-w-xl text-base leading-7 text-muted sm:text-lg lg:mx-0">
              Clear the clutter, keep what matters, and imagine your product in
              a brand-new scene.
            </p>
            <div className="hero-actions mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
              <a href="#studio-preview" className={buttonClasses("primary", "group")}>
                Explore the preview
                <ArrowRight
                  size={16}
                  className="transition-transform group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </a>
              <a href="#how-it-works" className={buttonClasses("secondary")}>
                How it works
                <ArrowDown size={16} aria-hidden="true" />
              </a>
            </div>
            <p className="hero-note mt-4 text-xs text-muted">
              Illustration only · Open Workspace for live uploads and editing
            </p>
          </div>

          <div className="hero-visual relative mx-auto w-full max-w-2xl" aria-label="Illustration of an image cutout preview">
            <div className="hero-orbit hero-orbit-one" aria-hidden="true" />
            <div className="hero-orbit hero-orbit-two" aria-hidden="true" />
            <div className="hero-art-frame relative aspect-[1.12/1] overflow-hidden rounded-2xl border border-white/10 bg-[#111217]">
              <div className="hero-art-glow" aria-hidden="true" />
              <div className="hero-original-scene" aria-hidden="true">
                <span className="hero-scene-sun" />
                <span className="hero-scene-horizon" />
              </div>
              <div className="checkerboard hero-cutout-scene" aria-hidden="true" />
              <div className="hero-product" aria-hidden="true">
                <svg viewBox="0 0 300 340" className="h-full w-full" fill="none">
                  <ellipse cx="151" cy="299" rx="74" ry="12" fill="#06070A" opacity=".42" />
                  <path d="M124 57h54v29l17 22v158c0 18-14 32-32 32h-24c-18 0-32-14-32-32V108l17-22V57Z" fill="url(#pixoraBottle)" stroke="#E4DDFB" strokeOpacity=".7" strokeWidth="2" />
                  <path d="M128 57h46V38h-46v19Z" fill="#B5A2FF" stroke="#E4DDFB" strokeWidth="2" />
                  <path d="M136 38V24h30v14" stroke="#E4DDFB" strokeWidth="3" strokeLinecap="round" />
                  <path d="M111 128h84v111c0 14-11 25-25 25h-34c-14 0-25-11-25-25V128Z" fill="#292735" fillOpacity=".85" stroke="#FFFFFF" strokeOpacity=".15" />
                  <path d="M128 155h50M128 165h34" stroke="#D8D1F2" strokeOpacity=".8" strokeWidth="3" strokeLinecap="round" />
                  <path d="M118 108h66" stroke="#FFF" strokeOpacity=".46" strokeWidth="2" strokeLinecap="round" />
                  <defs>
                    <linearGradient id="pixoraBottle" x1="108" y1="100" x2="206" y2="277" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#C5B7FF" />
                      <stop offset=".48" stopColor="#7662C7" />
                      <stop offset="1" stopColor="#363342" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <div className="hero-scan-line" aria-hidden="true" />
              <div className="hero-split-line" aria-hidden="true">
                <span><ArrowRight size={13} /></span>
              </div>
              <span className="hero-image-label hero-label-original">Original</span>
              <span className="hero-image-label hero-label-cutout">Cutout preview</span>
              <span className="hero-float-tag hero-float-format">JPG · PNG · WEBP</span>
              <span className="hero-float-tag hero-float-note">A small preview, not a real cutout</span>
              <span className="hero-corner-mark hero-corner-top" aria-hidden="true" />
              <span className="hero-corner-mark hero-corner-bottom" aria-hidden="true" />
            </div>
            <p className="mt-4 text-center text-xs text-muted">
              An animated illustration of the before-and-after workspace
            </p>
          </div>
        </Container>
      </section>

      <section id="studio-preview" className="py-10 sm:py-14">
        <Container>
          <div className="panel-shadow overflow-hidden rounded-2xl border border-line bg-surface">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-6">
              <div>
                <p className="text-sm font-medium text-ink">Studio preview</p>
                <p className="mt-0.5 text-xs text-muted">
                  An illustration of the upload and comparison workflow
                </p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full border border-line bg-canvas px-3 py-1.5 text-xs text-muted">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" aria-hidden="true" />
                Preview only
              </span>
            </div>

            <div className="grid gap-4 p-3 sm:p-5 lg:grid-cols-[0.82fr_1.18fr]">
              <UploadPreview />
              <div className="min-w-0 rounded-xl border border-line bg-canvas p-4 sm:p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-ink">Before & after</p>
                    <p className="mt-1 text-xs text-muted">
                      Drag the handle to compare
                    </p>
                  </div>
                  <span className="rounded-md border border-line bg-surface px-2 py-1 text-[10px] font-medium tracking-wide text-muted">
                    ILLUSTRATION
                  </span>
                </div>
                <ComparisonSlider />
              </div>
            </div>

            <div className="border-t border-line px-4 py-3 sm:px-6">
              <p className="text-xs leading-5 text-muted">
                The bottle is an illustration, not an uploaded or AI-processed
                photo. Choosing an image above only checks its type and size in
                your browser.
              </p>
            </div>
          </div>
        </Container>
      </section>

      <section id="how-it-works" className="border-y border-line bg-surface/75 py-16 backdrop-blur-sm sm:py-20">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold tracking-[0.16em] text-accent uppercase">
              A simple workflow
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              Three steps to a cleaner image
            </h2>
            <p className="mt-3 leading-7 text-muted">
              The product is being built around a clear, reviewable editing flow.
            </p>
          </div>
          <ol className="mt-10 grid gap-4 md:grid-cols-3">
            {steps.map((step) => (
              <li
                key={step.number}
                className="rounded-xl border border-line bg-canvas p-5 sm:p-6"
              >
                <p className="text-xs font-semibold tracking-widest text-accent">
                  STEP {step.number}
                </p>
                <h3 className="mt-4 text-lg font-medium text-ink">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{step.text}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section id="features" className="py-16 sm:py-20">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold tracking-[0.16em] text-accent uppercase">
              Designed for product photos
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              The details that make a useful editor
            </h2>
            <p className="mt-3 leading-7 text-muted">
              A focused set of tools for clean cutouts, flexible scenes, and
              work you can return to.
            </p>
          </div>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <article
                key={feature.title}
                className="rounded-xl border border-line bg-surface p-5 transition duration-200 hover:-translate-y-1 hover:border-accent/40 sm:p-6"
              >
                <span className="grid h-9 w-9 place-items-center rounded-lg border border-line bg-canvas text-accent">
                  <feature.icon size={18} aria-hidden="true" />
                </span>
                <h3 className="mt-4 font-medium text-ink">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{feature.text}</p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section id="faq" className="py-16 sm:py-20">
        <Container className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14">
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-accent uppercase">
              FAQ
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
              A few things to know
            </h2>
            <p className="mt-3 leading-7 text-muted">
              Clear answers about Workspace, image processing, and guest history.
            </p>
          </div>
          <FaqList />
        </Container>
      </section>
    </>
  )
}
