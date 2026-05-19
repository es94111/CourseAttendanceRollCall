import { prisma } from "@/lib/prisma"
import { handleRouteError, json, parseJson, requireAdmin } from "@/lib/api"
import { leaveSchema } from "@/lib/validation"
import { writeAuditLog } from "@/lib/audit"

export async function POST(request: Request) {
  const guard = await requireAdmin()
  if ("response" in guard) return guard.response
  const parsed = await parseJson(request, leaveSchema)
  if ("response" in parsed) return parsed.response
  try {
    const leave = await prisma.leaveRecord.create({
      data: { ...parsed.data, createdBy: guard.user.id }
    })
    const record = await prisma.attendanceRecord.upsert({
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
