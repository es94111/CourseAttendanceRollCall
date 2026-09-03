import { error, handleRouteError, json, parseJson, requireAdmin } from "@/lib/api"
import { writeAuditLog } from "@/lib/audit"
import { normalizeConnectionAccessRule } from "@/lib/connection-access"
import { prisma } from "@/lib/prisma"
import { connectionAccessRulesSchema } from "@/lib/validation"

export async function GET() {
  const guard = await requireAdmin()
  if ("response" in guard) return guard.response
  try {
    const rules = await prisma.connectionAccessRule.findMany({
      orderBy: [{ action: "asc" }, { targetType: "asc" }, { value: "asc" }]
    })
    return json({ rules })
  } catch (cause) {
    return handleRouteError(cause)
  }
}

export async function PUT(request: Request) {
  const guard = await requireAdmin()
  if ("response" in guard) return guard.response
  const parsed = await parseJson(request, connectionAccessRulesSchema)
  if ("response" in parsed) return parsed.response
  try {
    let normalizedRules: ReturnType<typeof normalizeConnectionAccessRule>[]
    try {
      normalizedRules = parsed.data.rules.map(normalizeConnectionAccessRule)
    } catch (cause) {
      return error(cause instanceof Error ? cause.message : "連線規則格式錯誤", 400)
    }
    const rules = Array.from(
      new Map(
        normalizedRules.map((rule) => [`${rule.action}:${rule.targetType}:${rule.value}`, rule])
      ).values()
    )

    const oldRules = await prisma.connectionAccessRule.findMany({
      orderBy: [{ action: "asc" }, { targetType: "asc" }, { value: "asc" }]
    })
    await prisma.$transaction(async (tx) => {
      await tx.connectionAccessRule.deleteMany()
      if (rules.length > 0) {
        await tx.connectionAccessRule.createMany({
          data: rules.map((rule) => ({
            action: rule.action,
            targetType: rule.targetType,
            value: rule.value,
            note: rule.note,
            enabled: rule.enabled
          }))
        })
      }
    })
    await writeAuditLog({
      eventType: "connection_access_update",
      actorId: guard.user.id,
      actorEmail: guard.user.email ?? "",
      target: { total: rules.length },
      oldValue: oldRules,
      newValue: rules
    })
    return json({ rules })
  } catch (cause) {
    return handleRouteError(cause)
  }
}
