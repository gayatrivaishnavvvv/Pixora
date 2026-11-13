import { ChevronDown } from "lucide-react"
import { useState } from "react"

const items = [
  {
    question: "Which files can I use?",
    answer:
      "Workspace accepts JPG, PNG, and WEBP images up to 10 MB. The interactive preview on this landing page stays local and does not upload files.",
  },
  {
    question: "Does background removal work yet?",
    answer:
      "Yes. Workspace sends verified uploads to remove.bg for processing. The backend needs a REMOVE_BG_API_KEY and the app needs its MongoDB and Cloudinary settings configured.",
  },
  {
    question: "How many images can I process as a guest?",
    answer:
      "Guests can remove backgrounds from two distinct images in a guest session. Create a free account or sign in to process more images.",
  },
  {
    question: "Where will uploaded images go?",
    answer:
      "Workspace uploads originals and processed PNGs to Cloudinary and saves their metadata in MongoDB. Guest history is retained for 30 days; account history remains until you delete it.",
  },
  {
    question: "Will I be able to edit an image later?",
    answer:
      "Yes. Open History to preview a saved original and cutout, then continue editing without uploading the original again. Your saved editing settings are restored when available.",
  },
  {
    question: "Can I change the background without processing again?",
    answer:
      "Yes. The editor reuses the saved transparent cutout for background changes, placement, and exports without rerunning background removal.",
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
