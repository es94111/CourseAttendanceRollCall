import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { AdminNavigation } from "@/components/shared/AdminNavigation"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user || session.user.role !== "admin") redirect("/login")
  const displayName = session.user.name ?? session.user.email ?? "管理員"

  return (
    <div className="admin-frame">
      <AdminNavigation displayName={displayName} email={session.user.email ?? null} />
      <div className="admin-content">{children}</div>
    </div>
  )
}
