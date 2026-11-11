import { Link } from "react-router-dom"
import Container from "../components/ui/Container"
import PageHeader from "../components/ui/PageHeader"
import { buttonClasses } from "../components/ui/buttonClasses"

export default function NotFoundPage() {
  return (
    <Container className="py-16">
      <PageHeader eyebrow="404" title="This page is not here">
        The address may be mistyped, or the page has not been added.
      </PageHeader>
      <Link to="/" className={`${buttonClasses("primary")} mt-8`}>
        Back to home
      </Link>
    </Container>
  )
}
