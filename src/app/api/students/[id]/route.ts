import { prisma } from "@/lib/prisma"
import { error, handleRouteError, json, parseJson, requireAdmin } from "@/lib/api"
import { studentSchema } from "@/lib/validation"
import { normalizeEmail } from "@/lib/email"

export async function PATCH(request: Request, props: any) {
  const params = await props.params;
  const guard = await requireAdmin()
  if ("response" in guard) return guard.response
  const parsed = await parseJson(request, studentSchema)
  if ("response" in parsed) return parsed.response
  try {
    const existing = await prisma.student.findUnique({ where: { id: params.id } })
    if (!existing) return error("學生不存在", 404)
    const googleEmail = normalizeEmail(parsed.data.googleEmail)
    const userId = existing.googleEmail === googleEmail ? existing.userId : null
    const student = await prisma.student.update({
      where: { id: params.id },
      data: {
        studentCode: parsed.data.studentCode,
        name: parsed.data.name,
        googleEmail,
        userId
      }
    })
    return json(student)
  } catch (cause: any) {
    if (cause?.code === "P2002") return error("學號或 Google Email 已存在", 409)
    if (cause?.code === "P2025") return error("學生不存在", 404)
    return handleRouteError(cause)
  }
}

export async function DELETE(_request: Request, props: any) {
  const params = await props.params;
  const guard = await requireAdmin()
  if ("response" in guard) return guard.response
  try {
    const student = await prisma.student.findUnique({ where: { id: params.id } })
    if (!student) return error("學生不存在", 404)

    await prisma.$transaction(async (tx) => {
      await tx.attendanceRecord.deleteMany({ where: { studentId: params.id } })
      await tx.leaveRecord.deleteMany({ where: { studentId: params.id } })
      await tx.courseEnrollment.deleteMany({ where: { studentId: params.id } })
      await tx.student.delete({ where: { id: params.id } })

      if (student.userId) {
        await tx.session.deleteMany({ where: { userId: student.userId } })
        await tx.account.deleteMany({ where: { userId: student.userId } })
        await tx.user.delete({ where: { id: student.userId } })
      }
    })

    return json({ message: "學生已刪除" })
  } catch (cause: any) {
    if (cause?.code === "P2025") return error("學生不存在", 404)
    return handleRouteError(cause)
  }
}
