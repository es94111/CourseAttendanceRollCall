import { prisma } from "@/lib/prisma"
import { attendanceSchema } from "@/lib/validation"
import { error, handleRouteError, json, parseJson, requireUser } from "@/lib/api"
import { verifyToken } from "@/lib/hmac"
import { attendanceStatus, expireSessionIfNeeded } from "@/lib/session-expiry"
import { toTaipeiIso } from "@/lib/time"
import { normalizeEmail } from "@/lib/email"
import { getClientIpMetadata } from "@/lib/request-ip"
import { lookupIpinfoCountry } from "@/lib/ipinfo"
import { evaluateConnectionAccess } from "@/lib/connection-access"

export async function POST(request: Request) {
  const guard = await requireUser()
  if ("response" in guard) return guard.response
  const parsed = await parseJson(request, attendanceSchema)
  if ("response" in parsed) return parsed.response
  try {
    await expireSessionIfNeeded(parsed.data.sessionId)
    const session = await prisma.attendanceSession.findUnique({
      where: { id: parsed.data.sessionId },
      include: { course: true }
    })
    if (!session) return error("點名 Session 不存在", 404)
    const tokenResult = verifyToken(
      parsed.data.token,
      session.gracePeriodSeconds,
      Date.now(),
      session.qrCodeValiditySeconds
    )
    if (!tokenResult.valid || tokenResult.sessionId !== parsed.data.sessionId) {
      return error("Token 無效或已過期", 400)
    }
    if (session.status !== "active") return error("Session 已關閉", 403)
    const userEmail = normalizeEmail(guard.user.email)
    const student = userEmail
      ? await prisma.student.findFirst({ where: { googleEmail: { equals: userEmail, mode: "insensitive" } } })
      : null
    if (!student) return error("找不到對應學生記錄", 404)
    if (!student.userId) {
      await prisma.student.update({ where: { id: student.id }, data: { userId: guard.user.id, googleEmail: userEmail } })
    }
    const enrollment = await prisma.courseEnrollment.findUnique({
      where: { studentId_courseId: { studentId: student.id, courseId: session.courseId } }
    })
    if (!enrollment) return error("學生未選修此課程", 404)
    const existing = await prisma.attendanceRecord.findUnique({
      where: { sessionId_studentId: { sessionId: session.id, studentId: student.id } }
    })
    if (existing) return error("已完成點名，不重複記錄", 409)
    const attendedAt = tokenResult.issuedAt ?? new Date()
    const status = attendanceStatus(
      attendedAt,
      session.createdAt,
      session.course.lateThresholdMinutes
    )
    const clientIp = getClientIpMetadata(request.headers)
    const ipinfo = await lookupIpinfoCountry(clientIp.ipAddress)
    const ipCountry = ipinfo.ipCountry ?? clientIp.ipCountry
    const access = await evaluateConnectionAccess({ ipAddress: clientIp.ipAddress, ipCountry })
    if (!access.allowed) return error(access.reason ?? "此連線來源不允許點名", 403)
    const record = await prisma.attendanceRecord.create({
      data: {
        sessionId: session.id,
        studentId: student.id,
        status,
        attendedAt,
        ipAddress: clientIp.ipAddress,
        ipCountry,
        ipCountryName: ipinfo.ipCountryName,
        userAgent: request.headers.get("user-agent")
      }
    })
    return json({ message: "點名成功", status: record.status, attendedAt: toTaipeiIso(record.attendedAt) })
  } catch (cause) {
    return handleRouteError(cause)
  }
}
