import Link from "next/link"
import { redirect } from "next/navigation"
import { auth, signOut } from "@/lib/auth"

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user || session.user.role !== "student") redirect("/login")
  const displayName = session.user.name ?? session.user.email ?? "同學"

  return (
    <div>
      <header className="app-header">
        <nav className="nav" aria-label="學生導覽">
          <Link href="/my-attendance" className="brand">
            <span className="brand-mark" aria-hidden>
              CA
            </span>
            學生出席
          </Link>
          <div className="links">
            <Link href="/my-attendance">我的出席記錄</Link>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-muted" style={{ fontSize: "0.875rem" }}>
              {displayName}
            </span>
            <form
              action={async () => {
                "use server"
                await signOut({ redirectTo: "/login" })
              }}
            >
              <button
                className="btn secondary"
                type="submit"
                style={{ minHeight: 36, padding: "0 12px", fontSize: "0.875rem" }}
              >
                登出
              </button>
            </form>
          </div>
        </nav>
      </header>
      {children}
    </div>
  )
}
