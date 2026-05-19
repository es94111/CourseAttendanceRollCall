import { prisma } from "@/lib/prisma"
import { handleRouteError, json, requireAdmin } from "@/lib/api"
import { serializeCourse } from "@/lib/serializers"

export async function GET() {
  const guard = await requireAdmin()
  if ("response" in guard) return guard.response
  try {
    const courses = await prisma.course.findMany({
      where: { status: "archived" },
      include: { _count: { select: { enrollments: true } } },
      orderBy: { updatedAt: "desc" }
    })
    return json(courses.map(serializeCourse))
  } catch (cause) {
    return handleRouteError(cause)
  }
}
