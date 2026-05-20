import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { SecureSignOutButton } from "@/components/shared/SecureSignOutButton"

const NAV_ITEMS = [
  { href: "/dashboard", label: "總覽" },
  { href: "/courses", label: "課程" },
  { href: "/students", label: "學生" },
  { href: "/courses/archived", label: "封存" },
  { href: "/users", label: "使用者" },
  { href: "/audit-logs", label: "稽核" }
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user || session.user.role !== "admin") redirect("/login")
  const displayName = session.user.name ?? session.user.email ?? "管理員"

  return (
    <div>
      <header className="app-header">
        <nav className="nav" aria-label="管理員導覽">
          <Link href="/dashboard" className="brand">
            <span className="brand-mark" aria-hidden>
              CA
            </span>
            管理後台
          </Link>
          <div className="links">
            {NAV_ITEMS.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-muted" style={{ fontSize: "0.875rem" }}>
              {displayName}
            </span>
            <SecureSignOutButton
              label="安全登出"
              style={{ minHeight: 36, padding: "0 12px", fontSize: "0.875rem" }}
            />
          </div>
        </nav>
      </header>
      {children}
    </div>
  )
}
