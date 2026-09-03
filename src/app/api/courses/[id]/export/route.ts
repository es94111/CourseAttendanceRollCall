import { error, handleRouteError, requireAdmin } from "@/lib/api"
import { writeAuditLog } from "@/lib/audit"
import { attendanceRowsToCsv } from "@/lib/csv"
import { prisma } from "@/lib/prisma"
import { endOfTaipeiDay, startOfTaipeiDay } from "@/lib/time"

export async function GET(request: Request, props: any) {
  const params = await props.params
  const guard = await requireAdmin()
  if ("response" in guard) return guard.response
  try {
    const url = new URL(request.url)
    const startDate = url.searchParams.get("startDate")
    const endDate = url.searchParams.get("endDate")
    if (url.searchParams.get("confirmed") !== "true") return error("需確認 PII 匯出警告", 400)
    const dateWhere =
      startDate || endDate
        ? {
            createdAt: {
              gte: startDate ? startOfTaipeiDay(startDate) : undefined,
              lte: endDate ? endOfTaipeiDay(endDate) : undefined
            }
          }
        : {}
    const where = {
      session: {
        courseId: params.id,
        ...dateWhere
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
      target: {
        courseId: params.id,
        startDate: startDate ?? "全部時間",
        endDate: endDate ?? "全部時間",
        total
      }
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
