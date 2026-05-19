import { prisma } from "@/lib/prisma"
import { courseSchema } from "@/lib/validation"
import { handleRouteError, json, parseJson, requireAdmin } from "@/lib/api"
import { serializeCourse } from "@/lib/serializers"

export async function GET() {
  const guard = await requireAdmin()
  if ("response" in guard) return guard.response
  try {
    const courses = await prisma.course.findMany({
      where: { status: "active" },
      include: { _count: { select: { enrollments: true } } },
      orderBy: { createdAt: "desc" }
    })
    return json(courses.map(serializeCourse))
  } catch (cause) {
    return handleRouteError(cause)
  }
}

export async function POST(request: Request) {
  const guard = await requireAdmin()
  if ("response" in guard) return guard.response
  const parsed = await parseJson(request, courseSchema)
  if ("response" in parsed) return parsed.response
  try {
    const course = await prisma.course.create({ data: parsed.data })
    return json(serializeCourse(course), { status: 201 })
  } catch (cause) {
    return handleRouteError(cause)
  }
}
