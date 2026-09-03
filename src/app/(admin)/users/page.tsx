import { UserRoleManager } from "@/components/admin/UserRoleManager"
import { PageHeader } from "@/components/shared/PageHeader"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export default async function UsersPage() {
  const session = await auth()
  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } })
  return (
    <main className="shell">
      <PageHeader
        eyebrow="系統管理"
        title="使用者權限"
        description="管理登入者的角色；變更權限前請先確認帳號身分。"
      />
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
