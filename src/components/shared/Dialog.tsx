"use client"

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
  if (!open) return null
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="dialog" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
        <div className="toolbar">
          <h2>{title}</h2>
          <button className="btn secondary" type="button" onClick={onClose}>
            關閉
          </button>
        </div>
        {children}
      </section>
    </div>
  )
}
