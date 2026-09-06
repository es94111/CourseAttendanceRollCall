import { error, handleRouteError, json, parseJson, requireUser } from "@/lib/api"
import { writeAuditLog } from "@/lib/audit"
import { evaluateConnectionAccess } from "@/lib/connection-access"
import { normalizeEmail } from "@/lib/email"
import { verifyToken } from "@/lib/hmac"
import { lookupIpinfo } from "@/lib/ipinfo"
import { prisma } from "@/lib/prisma"
import { getClientIpMetadata } from "@/lib/request-ip"
import { attendanceStatus, expireSessionIfNeeded } from "@/lib/session-expiry"
import { getIpShareLimit } from "@/lib/system-settings"
import { toTaipeiIso } from "@/lib/time"
import { attendanceSchema } from "@/lib/validation"

export async function POST(request: Request) {
  const guard = await requireUser()
  if ("response" in guard) return guard.response
  const parsed = await parseJson(request, attendanceSchema)
  if ("response" in parsed) return parsed.response
  // Hoisted so the P2002 fallback in the catch block can re-read the winning
  // record when a concurrent duplicate submission loses the unique race.
  let student: {
    id: string
    studentCode: string | null
    name: string
    googleEmail: string | null
    userId: string | null
  } | null = null
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
      return error("點名連結已失效，請重新掃描最新的 QR Code", 400)
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
    let matchedByName = false
    student = await prisma.student.findFirst({
      where: {
        OR: [{ userId: guard.user.id }, { googleEmail: { equals: userEmail, mode: "insensitive" } }]
      }
    })
    if (!student) {
      // Deliberate design: admins may not preset googleEmail, so allow binding
      // by matching the Google account's display name against unbound roster
      // entries in this course — but only when the match is unambiguous
      // (exactly one candidate). Guarded below: binding is claim-based with
      // audit tagging, and only reaches entries no other account holds.
      const displayName = guard.user.name?.trim()
      if (displayName) {
        const nameCandidates = await prisma.student.findMany({
          where: {
            userId: null,
            googleEmail: null,
            name: { equals: displayName, mode: "insensitive" },
            enrollments: { some: { courseId: session.courseId } }
          }
        })
        if (nameCandidates.length === 1) {
          student = nameCandidates[0]
          matchedByName = true
        }
      }
    }
    if (!student) {
      return error("Google 帳號尚未綁定學生資料，請聯絡課程管理員", 404)
    }
    if (student.googleEmail && normalizeEmail(student.googleEmail) !== userEmail) {
      return error("Google 帳號與學生資料不一致，請聯絡課程管理員", 409)
    }

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
    let shouldWriteBindAudit = false
    let bindMethod: "email" | "name_match" = "email"
    if (!student.userId || student.googleEmail !== userEmail) {
      bindMethod = matchedByName ? "name_match" : "email"
      const claimed = await prisma.student.updateMany({
        where: {
          id: student.id,
          AND: [
            { OR: [{ userId: null }, { userId: guard.user.id }] },
            {
              OR: [
                { googleEmail: null },
                { googleEmail: { equals: userEmail, mode: "insensitive" } }
              ]
            }
          ]
        },
        data: { userId: guard.user.id, googleEmail: userEmail }
      })
      if (claimed.count !== 1) {
        return error("學生資料已綁定其他帳號，請聯絡課程管理員", 409)
      }
      shouldWriteBindAudit = true
    }

    if (shouldWriteBindAudit) {
      await writeAuditLog({
        eventType: "student_email_bind",
        actorId: guard.user.id,
        actorEmail: userEmail,
        target: {
          studentId: student.id,
          studentCode: student.studentCode,
          studentName: student.name,
          bindMethod
        },
        oldValue: { googleEmail: student.googleEmail, userId: student.userId },
        newValue: {
          googleEmail: userEmail,
          userId: guard.user.id,
          bindMethod,
          ipAddress: clientIp.ipAddress,
          ipCountry,
          ipCountryName: ipinfo.ipCountryName,
          userAgent: request.headers.get("user-agent")
        }
      })
    }
    const attendedAt = new Date()
    // FR-015: officialStartTime is the sole late-judgment baseline — the admin
    // may open the QR session before or after the official class start.
    const status = attendanceStatus(
      attendedAt,
      session.officialStartTime,
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
    // Concurrent duplicate submissions (e.g. network retries) race past the
    // "existing record" check above and hit the DB unique constraint instead —
    // the first submission already succeeded, so answer with the duplicate
    // wording (FR-013) rather than a 500.
    if (cause && typeof cause === "object" && "code" in cause && cause.code === "P2002") {
      try {
        // The P2002 came from inserting the attendance record, so the student
        // was already resolved and is guaranteed non-null at this point.
        const studentId = student?.id ?? ""
        const record = await prisma.attendanceRecord.findUnique({
          where: {
            sessionId_studentId: {
              sessionId: parsed.data.sessionId,
              studentId
            }
          },
          include: { session: { include: { course: true } } }
        })
        if (record) {
          return json({
            message: "已完成點名",
            status: record.status,
            attendedAt: toTaipeiIso(record.attendedAt),
            courseName: record.session.course.name,
            duplicate: true
          })
        }
      } catch (fallbackCause) {
        return handleRouteError(fallbackCause)
      }
    }
    return handleRouteError(cause)
  }
}
