import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { error, handleRouteError, json, parseJson, requireAdmin } from "@/lib/api"
import { normalizeEmail } from "@/lib/email"

const addStudentSchema = z.object({
  studentId: z.string().min(1).optional(),
  studentCode: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1).optional(),
  googleEmail: z.string().trim().email("Google Email 格式不符").optional().or(z.literal(""))
})

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
  const parsed = await parseJson(request, addStudentSchema)
  if ("response" in parsed) return parsed.response
  try {
    const course = await prisma.course.findUnique({ where: { id: params.id } })
    if (!course || course.status !== "active") return error("課程不存在或已封存", 404)

    let studentId = parsed.data.studentId

    if (!studentId) {
      if (!parsed.data.studentCode || !parsed.data.name) {
        return error("新增學生需要學號與姓名", 400)
      }
      const googleEmail = normalizeEmail(parsed.data.googleEmail)
      const existing = await prisma.student.findFirst({
        where: {
          OR: [
            { studentCode: parsed.data.studentCode },
            ...(googleEmail ? [{ googleEmail }] : [])
          ]
        }
      })
      if (existing) {
        studentId = existing.id
      } else {
        const student = await prisma.student.create({
          data: {
            studentCode: parsed.data.studentCode,
            name: parsed.data.name,
            googleEmail
          }
        })
        studentId = student.id
      }
    }

    const enrollment = await prisma.courseEnrollment.findUnique({
      where: { studentId_courseId: { studentId, courseId: params.id } }
    })
    if (enrollment) return error("學生已在此課程中", 409)
    await prisma.courseEnrollment.create({
      data: { studentId, courseId: params.id }
    })
    return json({ message: "學生已加入課程" }, { status: 201 })
  } catch (cause: any) {
    if (cause?.code === "P2002") return error("相同課程中學號重複", 400)
    return handleRouteError(cause)
  }
}
