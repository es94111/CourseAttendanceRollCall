import { error, handleRouteError, json, parseJson, requireAdmin } from "@/lib/api"
import { prisma } from "@/lib/prisma"
import { serializeCourse } from "@/lib/serializers"
import { coursePatchSchema } from "@/lib/validation"

export async function GET(_request: Request, props: any) {
  const params = await props.params
  const guard = await requireAdmin()
  if ("response" in guard) return guard.response
  try {
    const course = await prisma.course.findUnique({
      where: { id: params.id },
      include: {
        _count: { select: { enrollments: true } },
        enrollments: { include: { student: true }, orderBy: { createdAt: "asc" } },
        sessions: { orderBy: { createdAt: "desc" }, include: { records: true } }
      }
    })
    if (!course) return error("課程不存在", 404)
    return json({
      ...serializeCourse(course),
      students: course.enrollments.map(({ student }) => ({
        id: student.id,
        studentCode: student.studentCode,
        name: student.name,
        googleEmail: student.googleEmail,
        isGoogleLinked: Boolean(student.userId)
      })),
      sessions: course.sessions
    })
  } catch (cause) {
    return handleRouteError(cause)
  }
}

export async function PUT(request: Request, props: any) {
  const params = await props.params
  const guard = await requireAdmin()
  if ("response" in guard) return guard.response
  const parsed = await parseJson(request, coursePatchSchema)
  if ("response" in parsed) return parsed.response
  const data = parsed.data as any
  try {
    const existing = await prisma.course.findUnique({ where: { id: params.id } })
    if (!existing) return error("課程不存在", 404)
    const lateThresholdChanged =
      data.lateThresholdMinutes !== undefined &&
      data.lateThresholdMinutes !== existing.lateThresholdMinutes
    const course = await prisma.course.update({ where: { id: params.id }, data })
    return json({ ...serializeCourse(course), lateThresholdChanged })
  } catch (cause) {
    return handleRouteError(cause)
  }
}

export async function DELETE(_request: Request, props: any) {
  const params = await props.params
  const guard = await requireAdmin()
  if ("response" in guard) return guard.response
  try {
    const existing = await prisma.course.findUnique({ where: { id: params.id } })
    if (!existing) return error("課程不存在", 404)
    if (existing.status === "archived") {
      await prisma.$transaction(async (tx) => {
        const sessions = await tx.attendanceSession.findMany({
          where: { courseId: params.id },
          select: { id: true }
        })
        const sessionIds = sessions.map((session) => session.id)

        if (sessionIds.length > 0) {
          await tx.attendanceRecord.deleteMany({ where: { sessionId: { in: sessionIds } } })
          await tx.leaveRecord.deleteMany({ where: { sessionId: { in: sessionIds } } })
          await tx.attendanceSession.deleteMany({ where: { id: { in: sessionIds } } })
        }
        await tx.courseEnrollment.deleteMany({ where: { courseId: params.id } })
        await tx.course.delete({ where: { id: params.id } })
      })
      return json({ message: "課程已刪除" })
    }
    await prisma.course.update({ where: { id: params.id }, data: { status: "archived" } })
    return json({ message: "課程已封存" })
  } catch (cause) {
    return handleRouteError(cause)
  }
}
