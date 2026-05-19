import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user || session.user.role !== "admin") redirect("/login")
  return (
    <div>
      <header className="panel" style={{ borderRadius: 0 }}>
        <nav className="toolbar shell" style={{ paddingTop: 0, paddingBottom: 0 }}>
          <strong>管理後台</strong>
          <div className="toolbar">
            <Link href="/dashboard">總覽</Link>
            <Link href="/courses">課程</Link>
            <Link href="/courses/archived">封存</Link>
            <Link href="/users">使用者</Link>
            <Link href="/audit-logs">稽核</Link>
          </div>
        </nav>
      </header>
      {children}
    </div>
  )
}
