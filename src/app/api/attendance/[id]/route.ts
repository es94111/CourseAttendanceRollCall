import { error, handleRouteError, json, parseJson, requireAdmin } from "@/lib/api"
import { writeAuditLog } from "@/lib/audit"
import { prisma } from "@/lib/prisma"
import { manualAttendanceSchema } from "@/lib/validation"

export async function PUT(request: Request, props: any) {
  const params = await props.params
  const guard = await requireAdmin()
  if ("response" in guard) return guard.response
  const parsed = await parseJson(request, manualAttendanceSchema)
  if ("response" in parsed) return parsed.response
  try {
    const existing = await prisma.attendanceRecord.findUnique({ where: { id: params.id } })
    if (existing) {
      const record = await prisma.attendanceRecord.update({
        where: { id: params.id },
        data: { status: parsed.data.status, isManual: true }
      })
      await writeAuditLog({
        eventType: "manual_attendance_override",
        actorId: guard.user.id,
        actorEmail: guard.user.email ?? "",
        target: {
          attendanceRecordId: record.id,
          sessionId: record.sessionId,
          studentId: record.studentId
        },
        oldValue: existing,
        newValue: record,
        reason: parsed.data.reason
      })
      return json(record)
    }
    if (!parsed.data.sessionId || !parsed.data.studentId) {
      return error("新增補登需要 sessionId 與 studentId", 400)
    }
    const { sessionId, studentId } = parsed.data
    const session = await prisma.attendanceSession.findUnique({
      where: { id: sessionId },
      select: { courseId: true, status: true }
    })
    if (!session || session.status === "voided") {
      return error("點名 Session 不存在或已作廢", 404)
    }
    const enrollment = await prisma.courseEnrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId,
          courseId: session.courseId
        }
      }
    })
    if (!enrollment) return error("學生未選修此課程", 400)
    const record = await prisma.attendanceRecord.create({
      data: {
        id: params.id,
        sessionId,
        studentId,
        status: parsed.data.status,
        isManual: true,
        attendedAt: new Date()
      }
    })
    await writeAuditLog({
      eventType: "manual_attendance_override",
      actorId: guard.user.id,
      actorEmail: guard.user.email ?? "",
      target: {
        attendanceRecordId: record.id,
        sessionId: record.sessionId,
        studentId: record.studentId
      },
      oldValue: existing,
      newValue: record,
      reason: parsed.data.reason
    })
    return json(record)
  } catch (cause) {
    return handleRouteError(cause)
  }
}
