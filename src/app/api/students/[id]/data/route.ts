import { prisma } from "@/lib/prisma"
import { error, handleRouteError, json, requireAdmin } from "@/lib/api"
import { writeAuditLog } from "@/lib/audit"

export async function DELETE(request: Request, props: any) {
  const params = await props.params;
  const guard = await requireAdmin()
  if ("response" in guard) return guard.response
  try {
    const url = new URL(request.url)
    if (url.searchParams.get("confirmed") !== "true") return error("需二次確認刪除個資", 400)
    const student = await prisma.student.findUnique({ where: { id: params.id } })
    if (!student) return error("學生不存在", 404)
    if (student.userId === guard.user.id) return error("不可透過學生資料刪除自己的管理員帳號", 400)
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
      if (student.userId) await tx.user.delete({ where: { id: student.userId } })
      await tx.student.update({
        where: { id: params.id },
        data: { googleEmail: null, userId: null, name: "已刪除個資" }
      })
      await tx.attendanceRecord.updateMany({
        where: { studentId: params.id },
        data: { ipAddress: null, ipCountry: null, ipCountryName: null, userAgent: null }
      })
    })
    await writeAuditLog({
      eventType: "delete_student_data",
      actorId: guard.user.id,
      actorEmail: guard.user.email ?? "",
      target: { studentId: params.id, studentCode: student.studentCode }
    })
    return json({ message: "學生個人資料已刪除" })
  } catch (cause) {
    return handleRouteError(cause)
  }
}
