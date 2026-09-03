import { error, handleRouteError, json, parseJson, requireAdmin } from "@/lib/api"
import { writeAuditLog } from "@/lib/audit"
import { normalizeEmail } from "@/lib/email"
import { prisma } from "@/lib/prisma"
import { studentSchema } from "@/lib/validation"

export async function PATCH(request: Request, props: any) {
  const params = await props.params
  const guard = await requireAdmin()
  if ("response" in guard) return guard.response
  const parsed = await parseJson(request, studentSchema)
  if ("response" in parsed) return parsed.response
  try {
    const existing = await prisma.student.findUnique({ where: { id: params.id } })
    if (!existing) return error("學生不存在", 404)
    const studentCode = parsed.data.studentCode || null
    const googleEmail = normalizeEmail(parsed.data.googleEmail)
    const userId = googleEmail && existing.googleEmail === googleEmail ? existing.userId : null
    const student = await prisma.student.update({
      where: { id: params.id },
      data: {
        studentCode,
        name: parsed.data.name,
        googleEmail,
        userId
      }
    })
    if ((existing.googleEmail || existing.userId) && !googleEmail) {
      await writeAuditLog({
        eventType: "student_email_unbind",
        actorId: guard.user.id,
        actorEmail: guard.user.email ?? "",
        target: {
          studentId: existing.id,
          studentCode: existing.studentCode,
          studentName: existing.name
        },
        oldValue: { googleEmail: existing.googleEmail, userId: existing.userId },
        newValue: { googleEmail: null, userId: null }
      })
    }
    return json(student)
  } catch (cause: any) {
    if (cause?.code === "P2002") return error("學號或 Google Email 已存在", 409)
    if (cause?.code === "P2025") return error("學生不存在", 404)
    return handleRouteError(cause)
  }
}

export async function DELETE(request: Request, props: any) {
  const params = await props.params
  const guard = await requireAdmin()
  if ("response" in guard) return guard.response
  try {
    const url = new URL(request.url)
    if (url.searchParams.get("confirmed") !== "true") return error("需二次確認刪除學生", 400)
    const student = await prisma.student.findUnique({ where: { id: params.id } })
    if (!student) return error("學生不存在", 404)
    if (student.userId === guard.user.id) return error("不可透過刪除學生刪除自己的管理員帳號", 400)
    if (student.userId) {
      const linkedUser = await prisma.user.findUnique({
        where: { id: student.userId },
        select: { role: true }
      })
      if (linkedUser?.role === "admin") {
        const adminCount = await prisma.user.count({ where: { role: "admin" } })
        if (adminCount <= 1) return error("系統至少需保留 1 位管理員，無法刪除", 409)
      }
    }

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
