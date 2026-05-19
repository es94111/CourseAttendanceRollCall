import { prisma } from "@/lib/prisma"
import { handleRouteError, json, requireUser } from "@/lib/api"
import { calculateStats } from "@/lib/attendance-stats"

export async function GET() {
  const guard = await requireUser()
  if ("response" in guard) return guard.response
  try {
    const student = await prisma.student.findFirst({
      where: { googleEmail: guard.user.email ?? "" },
      include: {
        enrollments: {
          include: {
            course: { include: { sessions: true } }
          }
        },
        records: true
      }
    })
    if (!student) return json([])
    return json(
      student.enrollments.map(({ course }) => {
        const stats = calculateStats(
          course.sessions,
          student.records.filter((record) => record.sessionId && course.sessions.some((s) => s.id === record.sessionId))
        ).get(student.id)
        return {
          courseId: course.id,
          courseName: course.name,
          onTimeCount: stats?.onTimeCount ?? 0,
          lateCount: stats?.lateCount ?? 0,
          leaveCount: stats?.leaveCount ?? 0,
          absentCount: stats?.absentCount ?? course.sessions.filter((session) => session.status !== "voided").length,
          attendanceRate: stats?.attendanceRate ?? 0
        }
      })
    )
  } catch (cause) {
    return handleRouteError(cause)
  }
}
