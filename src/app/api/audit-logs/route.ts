import { prisma } from "@/lib/prisma"
import { handleRouteError, json, requireAdmin } from "@/lib/api"
import { endOfTaipeiDay, startOfTaipeiDay, toTaipeiIso } from "@/lib/time"

export async function GET(request: Request) {
  const guard = await requireAdmin()
  if ("response" in guard) return guard.response
  try {
    const url = new URL(request.url)
    const page = Number(url.searchParams.get("page") ?? 1)
    const pageSize = Number(url.searchParams.get("pageSize") ?? 50)
    const startDate = url.searchParams.get("startDate")
    const endDate = url.searchParams.get("endDate")
    const where: any = {
      eventType: url.searchParams.get("eventType") || undefined,
      actorEmail: url.searchParams.get("actorEmail")
        ? { contains: url.searchParams.get("actorEmail")!, mode: "insensitive" }
        : undefined,
      createdAt:
        startDate || endDate
          ? {
              gte: startDate ? startOfTaipeiDay(startDate) : undefined,
              lte: endDate ? endOfTaipeiDay(endDate) : undefined
            }
          : undefined
    }
    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    ])
    return json({
      total,
      page,
      pageSize,
      logs: logs.map((log) => ({ ...log, createdAt: toTaipeiIso(log.createdAt) }))
    })
  } catch (cause) {
    return handleRouteError(cause)
  }
}
