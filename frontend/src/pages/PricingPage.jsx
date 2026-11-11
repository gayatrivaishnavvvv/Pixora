import Container from "../components/ui/Container"
import PageHeader from "../components/ui/PageHeader"

const plans = [
  {
    name: "Guest",
    detail: "Try the editor",
    points: [
      "Check a photo before it is stored",
      "Preview the cutout on a checkerboard",
      "Download once processing is connected",
    ],
  },
  {
    name: "Account",
    detail: "Keep your work",
    points: [
      "History saved to your account",
      "Reopen an image and continue editing",
      "Colors, presets, and your own backgrounds",
    ],
  },
  {
    name: "Shop",
    detail: "For a catalog",
    points: [
      "Everything in Account",
      "A higher monthly volume",
      "Room for a small team to share a library",
    ],
  },
]

export default function PricingPage() {
  return (
    <Container className="py-16">
      <PageHeader eyebrow="Pricing" title="Plans, without checkout">
        These are the shapes of the product. Prices are not set, and nothing on
        this page can be purchased.
      </PageHeader>
      <div className="mt-12 grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => (
          <article
            key={plan.name}
            className="rounded-xl border border-line bg-surface p-6"
          >
            <h2 className="text-lg font-medium text-ink">{plan.name}</h2>
            <p className="mt-1 text-sm text-muted">{plan.detail}</p>
            <ul className="mt-6 space-y-3">
              {plan.points.map((point) => (
                <li key={point} className="text-sm leading-6 text-ink">
                  {point}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </Container>
  )
}
