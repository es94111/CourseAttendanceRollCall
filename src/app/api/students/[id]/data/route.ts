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
    if (student.userId) await prisma.user.delete({ where: { id: student.userId } })
    await prisma.student.update({
      where: { id: params.id },
      data: { googleEmail: null, userId: null, name: "已刪除個資" }
    })
    await prisma.attendanceRecord.updateMany({
      where: { studentId: params.id },
      data: { ipAddress: null, ipCountry: null, ipCountryName: null, userAgent: null }
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
