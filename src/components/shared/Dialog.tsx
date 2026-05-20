"use client"

import { useEffect } from "react"

export function Dialog({
  title,
  open,
  children,
  onClose
}: {
  title: string
  open: boolean
  children: React.ReactNode
  onClose: () => void
}) {
  useEffect(() => {
    if (!open) return
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleKey)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", handleKey)
      document.body.style.overflow = ""
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <h2 id="dialog-title">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="關閉對話視窗"
            className="inline-grid place-items-center shrink-0 rounded-md text-[color:var(--color-text-muted)] hover:bg-[color:var(--color-bg-muted)] hover:text-[color:var(--color-text)] transition-colors"
            style={{ width: 32, height: 32 }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        {children}
      </section>
    </div>
  )
}
