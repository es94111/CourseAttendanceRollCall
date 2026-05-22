import { auth } from "@/lib/auth"
import { normalizeEmail } from "@/lib/email"
import { error, handleRouteError, json } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import { expireSessionIfNeeded } from "@/lib/session-expiry"
import { toTaipeiIso } from "@/lib/time"

export async function GET(_request: Request, { params }: any) {
  try {
    await expireSessionIfNeeded(params.id)
    const session = await prisma.attendanceSession.findUnique({
      where: { id: params.id },
      include: { course: true }
    })
    if (!session) return error("點名 Session 不存在", 404)

    const userSession = await auth()
    const userEmail = normalizeEmail(userSession?.user?.email)
    const student = userEmail
      ? await prisma.student.findFirst({
          where: {
            OR: [
              { userId: userSession?.user?.id },
              { googleEmail: { equals: userEmail, mode: "insensitive" } }
            ]
          }
        })
      : null
    const record = student
      ? await prisma.attendanceRecord.findUnique({
          where: { sessionId_studentId: { sessionId: session.id, studentId: student.id } }
        })
      : null

    return json({
      sessionId: session.id,
      courseName: session.course.name,
      sessionStatus: session.status,
      officialStartTime: toTaipeiIso(session.officialStartTime),
      attendance: record
        ? {
            status: record.status,
            attendedAt: toTaipeiIso(record.attendedAt)
          }
        : null
    })
  } catch (cause) {
    return handleRouteError(cause)
  }
}
