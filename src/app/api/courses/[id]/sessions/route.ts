import { prisma } from "@/lib/prisma"
import { error, handleRouteError, json, parseJson, requireAdmin } from "@/lib/api"
import { sessionCreateSchema } from "@/lib/validation"
import { writeAuditLog } from "@/lib/audit"
import { toTaipeiIso } from "@/lib/time"

export async function GET(_request: Request, { params }: any) {
  const guard = await requireAdmin()
  if ("response" in guard) return guard.response
  try {
    const sessions = await prisma.attendanceSession.findMany({
      where: { courseId: params.id },
      orderBy: { createdAt: "desc" }
    })
    return json(
      sessions.map((session) => ({
        ...session,
        officialStartTime: toTaipeiIso(session.officialStartTime),
        createdAt: toTaipeiIso(session.createdAt)
      }))
    )
  } catch (cause) {
    return handleRouteError(cause)
  }
}

export async function POST(request: Request, { params }: any) {
  const guard = await requireAdmin()
  if ("response" in guard) return guard.response
  const parsed = await parseJson(request, sessionCreateSchema)
  if ("response" in parsed) return parsed.response
  try {
    const course = await prisma.course.findUnique({ where: { id: params.id } })
    if (!course || course.status !== "active") return error("課程不存在或已封存", 404)
    const active = await prisma.attendanceSession.findFirst({
      where: { courseId: params.id, status: "active" }
    })
    if (active) return error("此課程已有進行中的 Session", 409)
    const session = await prisma.attendanceSession.create({
      data: {
        courseId: params.id,
        officialStartTime: new Date(parsed.data.officialStartTime),
        autoExpireMinutes: parsed.data.autoExpireMinutes,
        gracePeriodSeconds: parsed.data.gracePeriodSeconds,
        createdBy: guard.user.id
      }
    })
    await writeAuditLog({
      eventType: "session_opened",
      actorId: guard.user.id,
      actorEmail: guard.user.email ?? "",
      target: { courseId: params.id, sessionId: session.id },
      newValue: {
        officialStartTime: parsed.data.officialStartTime,
        gracePeriodSeconds: parsed.data.gracePeriodSeconds
      }
    })
    return json(session, { status: 201 })
  } catch (cause) {
    return handleRouteError(cause)
  }
}
