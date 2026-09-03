import { error, handleRouteError, json } from "@/lib/api"
import { auth } from "@/lib/auth"
import { checkConnectionAccess } from "@/lib/connection-access"
import { normalizeEmail } from "@/lib/email"
import { prisma } from "@/lib/prisma"
import { hasTrustedRequestOrigin } from "@/lib/request-security"
import { expireSessionIfNeeded } from "@/lib/session-expiry"
import { toTaipeiIso } from "@/lib/time"

export async function GET(_request: Request, props: any) {
  const params = await props.params
  if (!hasTrustedRequestOrigin(_request.headers)) {
    return error("請求來源驗證失敗", 403)
  }
  const access = await checkConnectionAccess(_request.headers, `/api/checkin/sessions/${params.id}`)
  if (!access.allowed) return error(access.reason ?? "此連線來源已被封鎖", 403)
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
