import { error, handleRouteError, json, requireAdmin } from "@/lib/api"
import { writeAuditLog } from "@/lib/audit"
import { prisma } from "@/lib/prisma"

export async function DELETE(_request: Request, props: any) {
  const params = await props.params
  const guard = await requireAdmin()
  if ("response" in guard) return guard.response
  if (guard.user.id === params.id) return error("不可刪除自己", 400)
  try {
    const existing = await prisma.user.findUnique({ where: { id: params.id } })
    if (!existing) return error("使用者不存在", 404)
    if (existing.role === "admin") {
      const adminCount = await prisma.user.count({ where: { role: "admin" } })
      if (adminCount <= 1) return error("系統至少需保留 1 位管理員，無法刪除", 409)
    }
    await writeAuditLog({
      eventType: "delete_user",
      actorId: guard.user.id,
      actorEmail: guard.user.email ?? "",
      target: {
        userId: existing.id,
        userEmail: existing.email,
        userName: existing.name,
        userRole: existing.role
      }
    })
    await prisma.user.delete({ where: { id: existing.id } })
    return json({ message: "使用者已刪除" })
  } catch (cause) {
    return handleRouteError(cause)
  }
}
