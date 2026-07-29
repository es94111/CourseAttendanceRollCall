import Link from "next/link"

export function PageHeader({
  title,
  description,
  eyebrow,
  backHref,
  backLabel,
  children
}: {
  title: string
  description?: string
  eyebrow?: string
  backHref?: string
  backLabel?: string
  children?: React.ReactNode
}) {
  return (
    <header className="page-header">
      <div className="page-header-copy">
        {backHref && (
          <Link href={backHref} className="page-back-link">
            <span aria-hidden>←</span>
            {backLabel ?? "返回"}
          </Link>
        )}
        {eyebrow && <p className="page-eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {children && <div className="page-actions">{children}</div>}
    </header>
  )
}
