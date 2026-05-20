import { prisma } from "@/lib/prisma"
import { coursePatchSchema } from "@/lib/validation"
import { error, handleRouteError, json, parseJson, requireAdmin } from "@/lib/api"
import { serializeCourse } from "@/lib/serializers"

export async function GET(_request: Request, { params }: any) {
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

export async function PUT(request: Request, { params }: any) {
  const guard = await requireAdmin()
  if ("response" in guard) return guard.response
  const parsed = await parseJson(request, coursePatchSchema)
  if ("response" in parsed) return parsed.response
  const data = parsed.data as any
  try {
    const existing = await prisma.course.findUnique({ where: { id: params.id } })
    if (!existing) return error("課程不存在", 404)
    const lateThresholdChanged =
      data.lateThresholdMinutes !== undefined && data.lateThresholdMinutes !== existing.lateThresholdMinutes
    const course = await prisma.course.update({ where: { id: params.id }, data })
    return json({ ...serializeCourse(course), lateThresholdChanged })
  } catch (cause) {
    return handleRouteError(cause)
  }
}

export async function DELETE(_request: Request, { params }: any) {
  const guard = await requireAdmin()
  if ("response" in guard) return guard.response
  try {
    const existing = await prisma.course.findUnique({ where: { id: params.id } })
    if (!existing) return error("課程不存在", 404)
    await prisma.course.update({ where: { id: params.id }, data: { status: "archived" } })
    return json({ message: "課程已封存" })
  } catch (cause) {
    return handleRouteError(cause)
  }
}
