import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export default async function UsersPage() {
  const session = await auth()
  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } })
  return (
    <main className="shell">
      <h1>使用者角色</h1>
      <table>
        <thead>
          <tr>
            <th>Email</th>
            <th>角色</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.email}</td>
              <td>{user.role}</td>
              <td>{user.id === session?.user.id ? "不可修改自身" : "使用 API /api/users/[id]/role 調整"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  )
}
