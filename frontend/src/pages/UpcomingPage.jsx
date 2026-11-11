import { Link } from "react-router-dom"
import Container from "../components/ui/Container"
import PageHeader from "../components/ui/PageHeader"
import { buttonClasses } from "../components/ui/buttonClasses"

const pages = {
  history: {
    eyebrow: "History",
    title: "Your Image History",
    body: "Processed images will appear here after a real upload and background removal. There is no sample gallery.",
  },
}

export default function UpcomingPage({ page }) {
  const content = pages[page]
  return (
    <Container className="py-16">
      <PageHeader eyebrow={content.eyebrow} title={content.title}>
        {content.body}
      </PageHeader>
      <Link to="/" className={`${buttonClasses("secondary")} mt-8`}>
        Back to home
      </Link>
    </Container>
  )
}
