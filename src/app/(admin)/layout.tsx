import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { checkConnectionAccess } from "@/lib/connection-access"
import { AdminNavigation } from "@/components/shared/AdminNavigation"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user || session.user.role !== "admin") redirect("/login")

  // API routes enforce connection rules via requireUser/requireAdmin; SSR pages
  // must enforce them too, otherwise blocked sources can still read PII that
  // server-rendered admin pages embed in their HTML.
  const requestHeaders = await headers()
  const access = await checkConnectionAccess(requestHeaders, "/(admin)")
  if (!access.allowed) redirect("/login?error=connection-blocked")

  const displayName = session.user.name ?? session.user.email ?? "管理員"

  return (
    <div className="admin-frame">
      <AdminNavigation displayName={displayName} email={session.user.email ?? null} />
      <div className="admin-content">{children}</div>
    </div>
  )
}
