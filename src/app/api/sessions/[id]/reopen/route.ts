import { error, handleRouteError, json, requireAdmin } from "@/lib/api"
import { writeAuditLog } from "@/lib/audit"
import { prisma } from "@/lib/prisma"

export async function POST(_request: Request, props: any) {
  const params = await props.params
  const guard = await requireAdmin()
  if ("response" in guard) return guard.response
  try {
    const session = await prisma.attendanceSession.findUnique({ where: { id: params.id } })
    if (!session) return error("點名 Session 不存在", 404)
    if (session.status === "active") return error("此 Session 已在進行中", 409)
    if (session.status === "voided") return error("已作廢的 Session 無法重新開啟", 400)
    const otherActive = await prisma.attendanceSession.findFirst({
      where: { courseId: session.courseId, status: "active", NOT: { id: session.id } }
    })
    if (otherActive) return error("此課程已有其他進行中的 Session", 409)

    const autoExpireExpired =
      session.autoExpireMinutes !== null &&
      session.createdAt.getTime() + session.autoExpireMinutes * 60_000 <= Date.now()

    const updated = await prisma.attendanceSession.update({
      where: { id: params.id },
      data: {
        status: "active",
        ...(autoExpireExpired ? { autoExpireMinutes: null } : {})
      }
    })
    await writeAuditLog({
      eventType: "session_reopened",
      actorId: guard.user.id,
      actorEmail: guard.user.email ?? "",
      target: { sessionId: params.id, courseId: session.courseId },
      oldValue: { status: session.status, autoExpireMinutes: session.autoExpireMinutes },
      newValue: { status: updated.status, autoExpireMinutes: updated.autoExpireMinutes }
    })
    return json({ message: "點名已重新開啟" })
  } catch (cause) {
    return handleRouteError(cause)
  }
}
