export default function PageHeader({ eyebrow, title, children }) {
  return (
    <header className="max-w-2xl">
      {eyebrow ? (
        <p className="text-sm font-medium text-accent">{eyebrow}</p>
      ) : null}
      <h1 className="mt-2 text-4xl font-semibold tracking-tight text-ink">{title}</h1>
      {children ? (
        <p className="mt-4 text-lg leading-relaxed text-muted">{children}</p>
      ) : null}
    </header>
  )
}
