import { prisma } from "@/lib/prisma"
import { attendanceRowsToCsv } from "@/lib/csv"
import { error, handleRouteError, requireAdmin } from "@/lib/api"
import { endOfTaipeiDay, startOfTaipeiDay } from "@/lib/time"
import { writeAuditLog } from "@/lib/audit"

export async function GET(request: Request, { params }: any) {
  const guard = await requireAdmin()
  if ("response" in guard) return guard.response
  try {
    const url = new URL(request.url)
    const startDate = url.searchParams.get("startDate")
    const endDate = url.searchParams.get("endDate")
    if (!startDate || !endDate) return error("日期範圍未填", 400)
    if (url.searchParams.get("confirmed") !== "true") return error("需確認 PII 匯出警告", 400)
    const where = {
      session: {
        courseId: params.id,
        createdAt: { gte: startOfTaipeiDay(startDate), lte: endOfTaipeiDay(endDate) }
      }
    }
    const total = await prisma.attendanceRecord.count({ where })
    if (total > 30_000) return error("匯出筆數超過 30,000，請縮小日期範圍", 400)
    const rows = await prisma.attendanceRecord.findMany({
      where,
      include: { student: true, session: true },
      orderBy: { attendedAt: "asc" },
      take: 30_000
    })
    await writeAuditLog({
      eventType: "export_attendance",
      actorId: guard.user.id,
      actorEmail: guard.user.email ?? "",
      target: { courseId: params.id, startDate, endDate, total }
    })
    return new Response(attendanceRowsToCsv(rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="attendance-${params.id}.csv"`
      }
    })
  } catch (cause) {
    return handleRouteError(cause)
  }
}
