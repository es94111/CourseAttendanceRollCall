import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user || session.user.role !== "student") redirect("/login")
  return (
    <div>
      <header className="panel" style={{ borderRadius: 0 }}>
        <nav className="toolbar shell" style={{ paddingTop: 0, paddingBottom: 0 }}>
          <strong>學生出席</strong>
          <Link href="/my-attendance">我的出席記錄</Link>
        </nav>
      </header>
      {children}
    </div>
  )
}
