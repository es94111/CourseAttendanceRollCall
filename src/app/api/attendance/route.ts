import { prisma } from "@/lib/prisma"
import { attendanceSchema } from "@/lib/validation"
import { error, handleRouteError, json, parseJson, requireUser } from "@/lib/api"
import { verifyToken } from "@/lib/hmac"
import { attendanceStatus, expireSessionIfNeeded } from "@/lib/session-expiry"
import { toTaipeiIso } from "@/lib/time"
import { normalizeEmail } from "@/lib/email"
import { getClientIpMetadata } from "@/lib/request-ip"
import { lookupIpinfo } from "@/lib/ipinfo"
import { evaluateConnectionAccess } from "@/lib/connection-access"
import { getIpShareLimit } from "@/lib/system-settings"
import { writeAuditLog } from "@/lib/audit"

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
    const clientIp = getClientIpMetadata(request.headers)
    const ipinfo = await lookupIpinfo(clientIp.ipAddress)
    const ipCountry = ipinfo.ipCountry ?? clientIp.ipCountry
    const access = await evaluateConnectionAccess({
      ipAddress: clientIp.ipAddress,
      ipCountry,
      ipCountryName: ipinfo.ipCountryName,
      ipAsn: ipinfo.ipAsn,
      ipAsnName: ipinfo.ipAsnName
    })
    if (!access.allowed) return error(access.reason ?? "此連線來源不允許點名", 403)
    const userEmail = normalizeEmail(guard.user.email)
    if (!userEmail) return error("Google 帳號缺少 Email，無法點名", 400)
    let shouldWriteBindAudit = false
    let student = userEmail
      ? await prisma.student.findFirst({
          where: {
            OR: [
              { userId: guard.user.id },
              { googleEmail: { equals: userEmail, mode: "insensitive" } }
            ]
          }
        })
      : null

    if (!student) {
      if (!parsed.data.studentName) {
        return json(
          { error: "找不到對應學生記錄，請輸入姓名完成首次綁定", requiresStudentName: true },
          { status: 404 }
        )
      }
      const matches = await prisma.courseEnrollment.findMany({
        where: {
          courseId: session.courseId,
          student: {
            name: { equals: parsed.data.studentName, mode: "insensitive" },
            googleEmail: null,
            userId: null
          }
        },
        include: { student: true },
        take: 2
      })
      if (matches.length === 0) return error("此課程找不到尚未綁定的同名學生", 404)
      if (matches.length > 1) return error("此課程有多位同名學生，請聯絡管理員補充學號或 Email", 409)
      student = matches[0].student
      shouldWriteBindAudit = true
    }
    if (!student) return error("找不到對應學生記錄", 404)

    const enrollment = await prisma.courseEnrollment.findUnique({
      where: { studentId_courseId: { studentId: student.id, courseId: session.courseId } }
    })
    if (!enrollment) return error("學生未選修此課程", 404)

    const existing = await prisma.attendanceRecord.findUnique({
      where: { sessionId_studentId: { sessionId: session.id, studentId: student.id } }
    })
    if (existing) {
      return json({
        message: "已完成點名",
        status: existing.status,
        attendedAt: toTaipeiIso(existing.attendedAt),
        courseName: session.course.name,
        duplicate: true
      })
    }
    const ipShareLimit = await getIpShareLimit()
    if (ipShareLimit > 0 && clientIp.ipAddress) {
      const recentSameIp = await prisma.attendanceRecord.count({
        where: {
          sessionId: session.id,
          ipAddress: clientIp.ipAddress,
          studentId: { not: student.id }
        }
      })
      if (recentSameIp >= ipShareLimit) {
        return error("此連線已為多位學生簽到，請改由本人裝置完成點名", 429)
      }
    }
    if (!student.userId || student.googleEmail !== userEmail) {
      await prisma.student.update({
        where: { id: student.id },
        data: { userId: guard.user.id, googleEmail: userEmail }
      })
      shouldWriteBindAudit = true
    }

    if (shouldWriteBindAudit) {
      await writeAuditLog({
        eventType: "student_email_bind",
        actorId: guard.user.id,
        actorEmail: userEmail,
        target: { studentId: student.id, studentCode: student.studentCode, studentName: student.name },
        oldValue: { googleEmail: student.googleEmail, userId: student.userId },
        newValue: {
          googleEmail: userEmail,
          userId: guard.user.id,
          ipAddress: clientIp.ipAddress,
          ipCountry,
          ipCountryName: ipinfo.ipCountryName,
          userAgent: request.headers.get("user-agent")
        }
      })
    }
    const attendedAt = new Date()
    const status = attendanceStatus(
      attendedAt,
      session.createdAt,
      session.course.lateThresholdMinutes
    )
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
    return json({
      message: "點名成功",
      status: record.status,
      attendedAt: toTaipeiIso(record.attendedAt),
      courseName: session.course.name
    })
  } catch (cause) {
    return handleRouteError(cause)
  }
}
