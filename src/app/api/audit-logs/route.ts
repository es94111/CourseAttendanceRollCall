import { prisma } from "@/lib/prisma"
import { handleRouteError, json, requireAdmin } from "@/lib/api"
import { serializeAuditLogs } from "@/lib/audit-log-display"
import { endOfTaipeiDay, startOfTaipeiDay } from "@/lib/time"

const ALLOWED_EVENT_TYPES = new Set([
  "export_attendance",
  "manual_attendance_override",
  "leave_record_add",
  "void_session",
  "role_change",
  "delete_student_data",
  "delete_user",
  "session_opened",
  "session_settings_update",
  "connection_access_update",
  "connection_access_block",
  "allowed_email_domains_update"
])

function clampInt(value: string | null, fallback: number, min: number, max: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(Math.max(Math.trunc(parsed), min), max)
}

export async function GET(request: Request) {
  const guard = await requireAdmin()
  if ("response" in guard) return guard.response
  try {
    const url = new URL(request.url)
    const page = clampInt(url.searchParams.get("page"), 1, 1, 100_000)
    const pageSize = clampInt(url.searchParams.get("pageSize"), 50, 1, 200)
    const startDate = url.searchParams.get("startDate")
    const endDate = url.searchParams.get("endDate")
    const eventTypeRaw = url.searchParams.get("eventType")
    const eventType =
      eventTypeRaw && ALLOWED_EVENT_TYPES.has(eventTypeRaw) ? eventTypeRaw : undefined
    const where: any = {
      eventType,
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
      logs: await serializeAuditLogs(logs)
    })
  } catch (cause) {
    return handleRouteError(cause)
  }
}
