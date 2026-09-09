import { calculateStats } from "@/lib/attendance-stats"
import { prisma } from "@/lib/prisma"
import { endOfTaipeiDay, startOfTaipeiDay } from "@/lib/time"

interface StatisticsDateRange {
  startDate?: string | null
  endDate?: string | null
}

export interface CourseStatistics {
  courseId: string
  totalSessions: number
  students: Array<{
    studentId: string
    studentCode: string | null
    name: string
    onTimeCount: number
    lateCount: number
    leaveCount: number
    absentCount: number
    attendanceRate: number
  }>
}

export interface CourseStatisticsResult {
  data: CourseStatistics
  hasActiveSession: boolean
}

export async function getCourseStatistics(
  courseId: string,
  { startDate, endDate }: StatisticsDateRange = {}
): Promise<CourseStatisticsResult> {
  const dateWhere =
    startDate || endDate
      ? {
          createdAt: {
            gte: startDate ? startOfTaipeiDay(startDate) : undefined,
            lte: endDate ? endOfTaipeiDay(endDate) : undefined
          }
        }
      : {}

  const [sessions, enrollments] = await Promise.all([
    prisma.attendanceSession.findMany({ where: { courseId, ...dateWhere } }),
    prisma.courseEnrollment.findMany({
      where: { courseId },
      include: {
        student: {
          include: {
            records: { where: { session: { courseId, ...dateWhere } } }
          }
        }
      }
    })
  ])
  const records = enrollments.flatMap((enrollment) => enrollment.student.records)
  const stats = calculateStats(sessions, records)
  const totalSessions = sessions.filter((session) => session.status !== "voided").length

  return {
    data: {
      courseId,
      totalSessions,
      students: enrollments.map(({ student }) => {
        const stat = stats.get(student.id)
        return {
          studentId: student.id,
          studentCode: student.studentCode,
          name: student.name,
          onTimeCount: stat?.onTimeCount ?? 0,
          lateCount: stat?.lateCount ?? 0,
          leaveCount: stat?.leaveCount ?? 0,
          absentCount: stat?.absentCount ?? totalSessions,
          attendanceRate: stat?.attendanceRate ?? 0
        }
      })
    },
    hasActiveSession: sessions.some((session) => session.status === "active")
  }
}
