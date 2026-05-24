import { prisma } from "@/lib/prisma"
import { error, handleRouteError, json, parseJson, requireAdmin } from "@/lib/api"
import { roleSchema } from "@/lib/validation"
import { writeAuditLog } from "@/lib/audit"

export async function PUT(request: Request, props: any) {
  const params = await props.params;
  const guard = await requireAdmin()
  if ("response" in guard) return guard.response
  if (guard.user.id === params.id) return error("不可修改自身角色", 400)
  const parsed = await parseJson(request, roleSchema)
  if ("response" in parsed) return parsed.response
  try {
    const existing = await prisma.user.findUnique({ where: { id: params.id } })
    if (!existing) return error("使用者不存在", 404)
    await prisma.user.update({ where: { id: params.id }, data: { role: parsed.data.role } })
    await writeAuditLog({
      eventType: "role_change",
      actorId: guard.user.id,
      actorEmail: guard.user.email ?? "",
      target: { userId: params.id },
      oldValue: { role: existing.role },
      newValue: { role: parsed.data.role }
    })
    return json({ message: "角色已更新" })
  } catch (cause) {
    return handleRouteError(cause)
  }
}
