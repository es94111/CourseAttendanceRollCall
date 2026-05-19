import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { error, handleRouteError, json, parseJson, requireAdmin } from "@/lib/api"

export async function GET(_request: Request, { params }: any) {
  const guard = await requireAdmin()
  if ("response" in guard) return guard.response
  try {
    const enrollments = await prisma.courseEnrollment.findMany({
      where: { courseId: params.id },
      include: { student: true },
      orderBy: { createdAt: "asc" }
    })
    return json(
      enrollments.map(({ student }) => ({
        id: student.id,
        studentCode: student.studentCode,
        name: student.name,
        googleEmail: student.googleEmail,
        isGoogleLinked: Boolean(student.userId)
      }))
    )
  } catch (cause) {
    return handleRouteError(cause)
  }
}

export async function POST(request: Request, { params }: any) {
  const guard = await requireAdmin()
  if ("response" in guard) return guard.response
  const parsed = await parseJson(request, z.object({ studentId: z.string().min(1) }))
  if ("response" in parsed) return parsed.response
  try {
    const exists = await prisma.courseEnrollment.findUnique({
      where: { studentId_courseId: { studentId: parsed.data.studentId, courseId: params.id } }
    })
    if (exists) return error("學生已在此課程中", 409)
    await prisma.courseEnrollment.create({
      data: { studentId: parsed.data.studentId, courseId: params.id }
    })
    return json({ message: "學生已加入課程" }, { status: 201 })
  } catch (cause: any) {
    if (cause?.code === "P2002") return error("相同課程中學號重複", 400)
    return handleRouteError(cause)
  }
}
