import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { SecureSignOutButton } from "@/components/shared/SecureSignOutButton"

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user || session.user.role !== "student") redirect("/login")
  const displayName = session.user.name ?? session.user.email ?? "同學"

  return (
    <div className="student-frame">
      <header className="app-header student-app-header">
        <nav className="nav" aria-label="學生導覽">
          <Link href="/my-attendance" className="brand">
            <span className="brand-mark" aria-hidden>
              ✓
            </span>
            <span>
              <strong>課程點名</strong>
              <small>學生專區</small>
            </span>
          </Link>
          <div className="student-account">
            <span>
              <strong>{displayName}</strong>
              <small>已登入</small>
            </span>
            <SecureSignOutButton
              label="登出"
              style={{ minHeight: 36, padding: "0 12px", fontSize: "0.875rem" }}
            />
          </div>
        </nav>
      </header>
      {children}
    </div>
  )
}
