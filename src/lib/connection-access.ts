import { isIP } from "node:net"
import { prisma } from "@/lib/prisma"

export type ConnectionAccessAction = "allow" | "block"
export type ConnectionAccessTargetType = "country" | "ip"

export interface ConnectionAccessRuleInput {
  action: ConnectionAccessAction
  targetType: ConnectionAccessTargetType
  value: string
  note?: string | null
  enabled?: boolean
}

export interface ConnectionIdentity {
  ipAddress: string | null
  ipCountry: string | null
}

export function normalizeConnectionAccessRule(input: ConnectionAccessRuleInput) {
  const value = input.value.trim()
  if (input.targetType === "country") {
    const country = value.toUpperCase()
    if (!/^[A-Z0-9]{2}$/.test(country)) throw new Error("國家代碼需為 2 碼，例如 TW、JP、US")
    return { ...input, value: country, note: input.note?.trim() || null, enabled: input.enabled ?? true }
  }

  if (!isIP(value)) throw new Error("IP 格式不正確")
  return { ...input, value, note: input.note?.trim() || null, enabled: input.enabled ?? true }
}

function ruleMatches(rule: { targetType: string; value: string }, identity: ConnectionIdentity) {
  if (rule.targetType === "country") return identity.ipCountry?.toUpperCase() === rule.value.toUpperCase()
  if (rule.targetType === "ip") return identity.ipAddress === rule.value
  return false
}

export async function evaluateConnectionAccess(identity: ConnectionIdentity) {
  const rules = await prisma.connectionAccessRule.findMany({ where: { enabled: true } })
  const blockRule = rules.find((rule) => rule.action === "block" && ruleMatches(rule, identity))
  if (blockRule) {
    return { allowed: false, reason: "此連線來源已被封鎖", rule: blockRule }
  }

  const allowRules = rules.filter((rule) => rule.action === "allow")
  if (allowRules.length > 0) {
    const allowRule = allowRules.find((rule) => ruleMatches(rule, identity))
    if (!allowRule) return { allowed: false, reason: "此連線來源不在允許清單內", rule: null }
  }

  return { allowed: true, reason: null, rule: null }
}
