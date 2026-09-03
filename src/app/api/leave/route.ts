import { error, handleRouteError, json, parseJson, requireAdmin } from "@/lib/api"
import { writeAuditLog } from "@/lib/audit"
import { prisma } from "@/lib/prisma"
import { leaveSchema } from "@/lib/validation"

export async function POST(request: Request) {
  const guard = await requireAdmin()
  if ("response" in guard) return guard.response
  const parsed = await parseJson(request, leaveSchema)
  if ("response" in parsed) return parsed.response
  try {
    const session = await prisma.attendanceSession.findUnique({
      where: { id: parsed.data.sessionId },
      select: { courseId: true, status: true }
    })
    if (!session || session.status === "voided") return error("點名 Session 不存在或已作廢", 404)
    const enrollment = await prisma.courseEnrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId: parsed.data.studentId,
          courseId: session.courseId
        }
      }
    })
    if (!enrollment) return error("學生未選修此課程", 400)

    const { leave, record } = await prisma.$transaction(async (tx) => {
      const leave = await tx.leaveRecord.create({
        data: { ...parsed.data, createdBy: guard.user.id }
      })
      const record = await tx.attendanceRecord.upsert({
        where: {
          sessionId_studentId: {
            sessionId: parsed.data.sessionId,
            studentId: parsed.data.studentId
          }
        },
        create: {
          sessionId: parsed.data.sessionId,
          studentId: parsed.data.studentId,
          status: "leave",
          isManual: true
        },
        update: { status: "leave", isManual: true }
      })
      return { leave, record }
    })
    await writeAuditLog({
      eventType: "leave_record_add",
      actorId: guard.user.id,
      actorEmail: guard.user.email ?? "",
      target: { leaveRecordId: leave.id, attendanceRecordId: record.id },
      reason: parsed.data.reason
    })
    return json({ message: "請假記錄已新增" }, { status: 201 })
  } catch (cause) {
    return handleRouteError(cause)
  }
}
