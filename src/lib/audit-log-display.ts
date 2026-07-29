import { prisma } from "@/lib/prisma"
import { toTaipeiIso } from "@/lib/time"

type AuditLogLike = {
  id: string
  eventType: unknown
  actorEmail: string
  target: unknown
  oldValue?: unknown
  newValue?: unknown
  reason: string | null
  createdAt: Date
}

function targetRecord(target: unknown) {
  if (!target || typeof target !== "object" || Array.isArray(target)) return null
  return target as Record<string, unknown>
}

function stringValue(value: unknown) {
  return typeof value === "string" && value ? value : null
}

export async function serializeAuditLogs(logs: AuditLogLike[]) {
  const courseIds = new Set<string>()
  const sessionIds = new Set<string>()
  const studentIds = new Set<string>()
  const userIds = new Set<string>()

  for (const log of logs) {
    const target = targetRecord(log.target)
    const oldValue = targetRecord(log.oldValue)
    const newValue = targetRecord(log.newValue)
    const courseId = stringValue(target?.courseId)
    const sessionId =
      stringValue(target?.sessionId) ??
      stringValue(newValue?.sessionId) ??
      stringValue(oldValue?.sessionId)
    const studentId =
      stringValue(target?.studentId) ??
      stringValue(newValue?.studentId) ??
      stringValue(oldValue?.studentId)
    const userId = stringValue(target?.userId)
    if (courseId) courseIds.add(courseId)
    if (sessionId) sessionIds.add(sessionId)
    if (studentId) studentIds.add(studentId)
    if (userId) userIds.add(userId)
  }

  const targetSessions = sessionIds.size
    ? await prisma.attendanceSession.findMany({
        where: { id: { in: [...sessionIds] } },
        select: { id: true, courseId: true, createdAt: true }
      })
    : []

  for (const session of targetSessions) {
    courseIds.add(session.courseId)
  }

  const [courses, students, users, courseSessions] = await Promise.all([
    courseIds.size
      ? prisma.course.findMany({
          where: { id: { in: [...courseIds] } },
          select: { id: true, name: true }
        })
      : Promise.resolve([]),
    studentIds.size
      ? prisma.student.findMany({
          where: { id: { in: [...studentIds] } },
          select: { id: true, name: true, studentCode: true }
        })
      : Promise.resolve([]),
    userIds.size
      ? prisma.user.findMany({
          where: { id: { in: [...userIds] } },
          select: { id: true, name: true, email: true }
        })
      : Promise.resolve([]),
    courseIds.size
      ? prisma.attendanceSession.findMany({
          where: { courseId: { in: [...courseIds] } },
          select: { id: true, courseId: true },
          orderBy: [{ courseId: "asc" }, { createdAt: "asc" }]
        })
      : Promise.resolve([])
  ])

  const courseById = new Map(courses.map((course) => [course.id, course]))
  const studentById = new Map(students.map((student) => [student.id, student]))
  const userById = new Map(users.map((user) => [user.id, user]))
  const sessionById = new Map(targetSessions.map((session) => [session.id, session]))
  const sessionOrderById = new Map<string, number>()
  const sessionCountByCourse = new Map<string, number>()

  for (const session of courseSessions) {
    const count = (sessionCountByCourse.get(session.courseId) ?? 0) + 1
    sessionCountByCourse.set(session.courseId, count)
    sessionOrderById.set(session.id, count)
  }

  return logs.map((log) => {
    const target = targetRecord(log.target)
    const oldValue = targetRecord(log.oldValue)
    const newValue = targetRecord(log.newValue)
    const enrichedTarget = target ? { ...target } : log.target

    if (target && typeof enrichedTarget === "object" && !Array.isArray(enrichedTarget)) {
      const record = enrichedTarget as Record<string, unknown>
      const sessionId =
        stringValue(target.sessionId) ??
        stringValue(newValue?.sessionId) ??
        stringValue(oldValue?.sessionId)
      const session = sessionId ? sessionById.get(sessionId) : null
      const courseId = stringValue(target.courseId) ?? session?.courseId ?? null
      const studentId =
        stringValue(target.studentId) ??
        stringValue(newValue?.studentId) ??
        stringValue(oldValue?.studentId)
      const userId = stringValue(target.userId)
      const course = courseId ? courseById.get(courseId) : null
      const student = studentId ? studentById.get(studentId) : null
      const user = userId ? userById.get(userId) : null
      const sessionOrder = sessionId ? sessionOrderById.get(sessionId) : null

      if (sessionId && !record.sessionId) record.sessionId = sessionId
      if (studentId && !record.studentId) record.studentId = studentId
      if (course) record.courseName = course.name
      if (sessionOrder) record.sessionLabel = `第 ${sessionOrder} 次點名`
      if (student) {
        record.studentDisplay = student.studentCode
          ? `${student.name}（學號 ${student.studentCode}）`
          : student.name
      }
      if (user) record.userDisplay = `${user.name || "未命名使用者"}（${user.email}）`
    }

    return {
      id: log.id,
      eventType: String(log.eventType),
      actorEmail: log.actorEmail,
      target: enrichedTarget,
      oldValue: log.oldValue,
      newValue: log.newValue,
      reason: log.reason,
      createdAt: toTaipeiIso(log.createdAt) ?? ""
    }
  })
}
