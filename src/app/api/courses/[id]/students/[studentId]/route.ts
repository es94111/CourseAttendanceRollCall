import { prisma } from "@/lib/prisma"
import { handleRouteError, json, requireAdmin } from "@/lib/api"

export async function DELETE(_request: Request, props: any) {
  const params = await props.params;
  const guard = await requireAdmin()
  if ("response" in guard) return guard.response
  try {
    await prisma.courseEnrollment.deleteMany({
      where: { courseId: params.id, studentId: params.studentId }
    })
    return json({ message: "學生已從課程移除" })
  } catch (cause) {
    return handleRouteError(cause)
  }
}
