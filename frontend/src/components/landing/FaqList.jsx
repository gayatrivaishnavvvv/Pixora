import { ChevronDown } from "lucide-react"
import { useState } from "react"

const items = [
  {
    question: "Which files can I use?",
    answer:
      "The preview accepts JPG, PNG, and WEBP files up to 10 MB. It checks the file type and size in your browser and does not upload or store it.",
  },
  {
    question: "Does background removal work yet?",
    answer:
      "Not yet. The page shows the planned experience, but it does not process images. A real background-removal provider will be connected in a later phase.",
  },
  {
    question: "Where will uploaded images go?",
    answer:
      "The planned upload flow sends images directly from your browser to Cloudinary using signed parameters from the backend. No image upload is active in this preview.",
  },
  {
    question: "Will I be able to edit an image later?",
    answer:
      "A history library is planned to let you reopen the original and processed image. It is not connected yet, and this page does not use sample history.",
  },
  {
    question: "Can I change the background without processing again?",
    answer:
      "That is the plan: once an image has a transparent cutout, changing its background should reuse that cutout. Editing and downloads are not available yet.",
  },
]

export default function FaqList() {
  const [open, setOpen] = useState(0)

  return (
    <div className="border-y border-line">
      {items.map((item, index) => {
        const isOpen = open === index
        const panelId = `faq-panel-${index}`
        return (
          <div key={item.question} className="border-b border-line last:border-b-0">
            <button
              type="button"
              className="flex w-full cursor-pointer items-center justify-between gap-6 py-5 text-left"
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => setOpen(isOpen ? -1 : index)}
            >
              <span className="font-medium text-ink">{item.question}</span>
              <ChevronDown
                size={18}
                className={`shrink-0 text-muted transition-transform ${
                  isOpen ? "rotate-180" : ""
                }`}
                aria-hidden="true"
              />
            </button>
            {isOpen ? (
              <p id={panelId} className="max-w-3xl pb-5 text-sm leading-6 text-muted">
                {item.answer}
              </p>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
