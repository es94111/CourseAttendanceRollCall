import { error, handleRouteError, json, parseJson, requireAdmin } from "@/lib/api"
import { writeAuditLog } from "@/lib/audit"
import { prisma } from "@/lib/prisma"
import { expireSessionIfNeeded } from "@/lib/session-expiry"
import { sessionSettingsPatchSchema } from "@/lib/validation"

export async function GET(_request: Request, props: any) {
  const params = await props.params
  const guard = await requireAdmin()
  if ("response" in guard) return guard.response
  try {
    await expireSessionIfNeeded(params.id)
    const session = await prisma.attendanceSession.findUnique({
      where: { id: params.id },
      include: { course: { include: { enrollments: true } }, records: true }
    })
    if (!session) return error("點名 Session 不存在", 404)
    return json({
      ...session,
      onTimeCount: session.records.filter((record) => record.status === "on_time").length,
      lateCount: session.records.filter((record) => record.status === "late").length,
      totalCount: session.records.length,
      enrolledCount: session.course.enrollments.length
    })
  } catch (cause) {
    return handleRouteError(cause)
  }
}

export async function PATCH(request: Request, props: any) {
  const params = await props.params
  const guard = await requireAdmin()
  if ("response" in guard) return guard.response
  const parsed = await parseJson(request, sessionSettingsPatchSchema)
  if ("response" in parsed) return parsed.response
  try {
    const existing = await prisma.attendanceSession.findUnique({ where: { id: params.id } })
    if (!existing) return error("點名 Session 不存在", 404)
    if (existing.status !== "active") return error("只能修改進行中的 Session", 403)

    const session = await prisma.attendanceSession.update({
      where: { id: params.id },
      data: { qrCodeValiditySeconds: parsed.data.qrCodeValiditySeconds }
    })
    await writeAuditLog({
      eventType: "session_settings_update",
      actorId: guard.user.id,
      actorEmail: guard.user.email ?? "",
      target: { sessionId: params.id, courseId: existing.courseId },
      oldValue: { qrCodeValiditySeconds: existing.qrCodeValiditySeconds },
      newValue: { qrCodeValiditySeconds: session.qrCodeValiditySeconds }
    })
    return json(session)
  } catch (cause) {
    return handleRouteError(cause)
  }
}
