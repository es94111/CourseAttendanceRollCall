import { prisma } from "@/lib/prisma"
import { handleRouteError, json, requireAdmin } from "@/lib/api"
import { calculateStats } from "@/lib/attendance-stats"
import { endOfTaipeiDay, startOfTaipeiDay } from "@/lib/time"

export async function GET(request: Request, props: any) {
  const params = await props.params;
  const guard = await requireAdmin()
  if ("response" in guard) return guard.response
  try {
    const url = new URL(request.url)
    const startDate = url.searchParams.get("startDate")
    const endDate = url.searchParams.get("endDate")
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
      prisma.attendanceSession.findMany({ where: { courseId: params.id, ...dateWhere } }),
      prisma.courseEnrollment.findMany({
        where: { courseId: params.id },
        include: {
          student: {
            include: {
              records: { where: { session: { courseId: params.id, ...dateWhere } } }
            }
          }
        }
      })
    ])
    const records = enrollments.flatMap((enrollment) => enrollment.student.records)
    const stats = calculateStats(sessions, records)
    return json({
      courseId: params.id,
      totalSessions: sessions.filter((session) => session.status !== "voided").length,
      students: enrollments.map(({ student }) => ({
        studentCode: student.studentCode,
        name: student.name,
        ...(stats.get(student.id) ?? {
          studentId: student.id,
          onTimeCount: 0,
          lateCount: 0,
          leaveCount: 0,
          absentCount: sessions.filter((session) => session.status !== "voided").length,
          attendanceRate: 0
        })
      }))
    })
  } catch (cause) {
    return handleRouteError(cause)
  }
}
