import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRoleManager } from "@/components/admin/UserRoleManager"

export default async function UsersPage() {
  const session = await auth()
  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } })
  return (
    <main className="shell">
      <h1>使用者角色</h1>
      <UserRoleManager
        currentUserId={session?.user.id ?? ""}
        users={users.map((user) => ({
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }))}
      />
    </main>
  )
}
