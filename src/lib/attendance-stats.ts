import type { AttendanceStatus } from "@/types"

interface SessionLike {
  id: string
  status: string
}

interface RecordLike {
  sessionId: string
  studentId: string
  status: AttendanceStatus
}

export function calculateStats(sessions: SessionLike[], records: RecordLike[]) {
  const countedSessions = sessions.filter((session) => session.status !== "voided")
  const sessionIds = new Set(countedSessions.map((session) => session.id))
  const byStudent = new Map<
    string,
    {
      studentId: string
      onTimeCount: number
      lateCount: number
      leaveCount: number
      absentCount: number
      attendanceRate: number
    }
  >()

  for (const record of records) {
    if (!sessionIds.has(record.sessionId)) continue
    const current =
      byStudent.get(record.studentId) ??
      {
        studentId: record.studentId,
        onTimeCount: 0,
        lateCount: 0,
        leaveCount: 0,
        absentCount: 0,
        attendanceRate: 0
      }
    if (record.status === "on_time") current.onTimeCount += 1
    if (record.status === "late") current.lateCount += 1
    if (record.status === "leave") current.leaveCount += 1
    byStudent.set(record.studentId, current)
  }

  for (const stat of byStudent.values()) {
    const present = stat.onTimeCount + stat.lateCount + stat.leaveCount
    stat.absentCount = Math.max(countedSessions.length - present, 0)
    stat.attendanceRate =
      countedSessions.length === 0
        ? 0
        : Math.round(((stat.onTimeCount + stat.lateCount) / countedSessions.length) * 1000) / 10
  }

  return byStudent
}
