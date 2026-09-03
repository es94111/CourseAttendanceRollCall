import { isIP } from "node:net"
import { writeAuditLog } from "@/lib/audit"
import { lookupIpinfo, normalizeAsn } from "@/lib/ipinfo"
import { logger } from "@/lib/logger"
import { prisma } from "@/lib/prisma"
import { getClientIpMetadata } from "@/lib/request-ip"

export type ConnectionAccessAction = "allow" | "block"
export type ConnectionAccessTargetType = "country" | "ip" | "asn"

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
  ipCountryName?: string | null
  ipAsn?: string | null
  ipAsnName?: string | null
  userAgent?: string | null
  path?: string | null
}

interface ParsedIpCidr {
  ip: string
  prefix: number
  version: 4 | 6
}

function parseIpCidr(value: string): ParsedIpCidr | null {
  const [ip, prefixText] = value.split("/")
  if (!ip || !prefixText || value.split("/").length !== 2) return null
  const version = isIP(ip)
  if (!version || !/^\d+$/.test(prefixText)) return null
  const ipVersion: 4 | 6 = version === 4 ? 4 : 6
  const prefix = Number(prefixText)
  const maxPrefix = ipVersion === 4 ? 32 : 128
  if (prefix < 0 || prefix > maxPrefix) return null
  return { ip, prefix, version: ipVersion }
}

function normalizeIpRuleValue(value: string) {
  const cidr = parseIpCidr(value)
  if (cidr) return `${cidr.ip}/${cidr.prefix}`
  if (isIP(value)) return value
  throw new Error("IP 格式不正確，請輸入單一 IP 或 CIDR 網段，例如 203.0.113.10 或 173.245.48.0/20")
}

function normalizeAsnRuleValue(value: string) {
  const asn = normalizeAsn(value)
  if (!asn) throw new Error("ASN 格式不正確，請輸入 AS 編號，例如 AS15169 或 15169")
  return asn
}

function ipv4ToBigInt(ip: string) {
  const parts = ip.split(".")
  if (parts.length !== 4) return null
  let value = 0n
  for (const part of parts) {
    if (!/^\d+$/.test(part)) return null
    const octet = Number(part)
    if (octet < 0 || octet > 255) return null
    value = (value << 8n) + BigInt(octet)
  }
  return value
}

function ipv6ToBigInt(ip: string) {
  const [leftText, rightText, extra] = ip.toLowerCase().split("::")
  if (extra !== undefined) return null
  const left = leftText ? leftText.split(":") : []
  const right = rightText ? rightText.split(":") : []
  const hasCompression = ip.includes("::")
  const missing = hasCompression ? 8 - left.length - right.length : 0
  const groups = hasCompression
    ? [...left, ...Array(Math.max(0, missing)).fill("0"), ...right]
    : ip.split(":")
  if (groups.length !== 8) return null
  let value = 0n
  for (const group of groups) {
    if (!/^[0-9a-f]{1,4}$/.test(group)) return null
    value = (value << 16n) + BigInt(Number.parseInt(group, 16))
  }
  return value
}

function ipToBigInt(ip: string, version: 4 | 6) {
  return version === 4 ? ipv4ToBigInt(ip) : ipv6ToBigInt(ip)
}

export function ipRuleMatches(ruleValue: string, ipAddress: string | null | undefined) {
  if (!ipAddress) return false
  const ipVersion = isIP(ipAddress)
  if (!ipVersion) return false

  const cidr = parseIpCidr(ruleValue)
  if (!cidr) return ipAddress === ruleValue
  if (cidr.version !== ipVersion) return false

  const totalBits = cidr.version === 4 ? 32 : 128
  const ruleIp = ipToBigInt(cidr.ip, cidr.version)
  const requestIp = ipToBigInt(ipAddress, cidr.version)
  if (ruleIp === null || requestIp === null) return false
  if (cidr.prefix === 0) return true

  const shift = BigInt(totalBits - cidr.prefix)
  return ruleIp >> shift === requestIp >> shift
}

export function normalizeConnectionAccessRule(input: ConnectionAccessRuleInput) {
  const value = input.value.trim()
  const note = input.note?.trim() || null
  const enabled = input.enabled ?? true

  if (input.targetType === "country") {
    const country = value.toUpperCase()
    if (!/^[A-Z0-9]{2}$/.test(country)) throw new Error("國家代碼需為 2 碼，例如 TW、JP、US")
    return { ...input, value: country, note, enabled }
  }

  if (input.targetType === "asn") {
    return { ...input, value: normalizeAsnRuleValue(value), note, enabled }
  }

  return { ...input, value: normalizeIpRuleValue(value), note, enabled }
}

function ruleMatches(rule: { targetType: string; value: string }, identity: ConnectionIdentity) {
  if (rule.targetType === "country")
    return identity.ipCountry?.toUpperCase() === rule.value.toUpperCase()
  if (rule.targetType === "ip") return ipRuleMatches(rule.value, identity.ipAddress)
  if (rule.targetType === "asn") {
    const ruleAsn = normalizeAsn(rule.value)
    const identityAsn = normalizeAsn(identity.ipAsn ?? null)
    return Boolean(ruleAsn && identityAsn && ruleAsn === identityAsn)
  }
  return false
}

/**
 * Every rule type depends on IP-derived data: IP/CIDR rules compare the
 * request IP, country rules come from CF headers, ASN rules from an ipinfo
 * lookup. When the client IP cannot be determined (TRUSTED_PROXY_MODE=none,
 * or a direct origin hit in cloudflare mode), none of them can be evaluated
 * reliably, so any non-empty rule set requires a client IP.
 */
export function connectionAccessRequiresClientIp(rules: { targetType: string }[]) {
  return rules.length > 0
}

function describeRuleTarget(rule: { targetType: string; value: string }) {
  if (rule.targetType === "country") return `國家 ${rule.value}`
  if (rule.targetType === "asn") return `ASN ${rule.value}`
  return `IP ${rule.value}`
}

export async function evaluateConnectionAccess(identity: ConnectionIdentity) {
  const rules = await prisma.connectionAccessRule.findMany({ where: { enabled: true } })

  // Fail closed: when the client IP is unknown, no rule type can be evaluated
  // reliably (IP rules have nothing to compare, country/ASN data is absent) —
  // neither block rules nor allow-list matching can be trusted, so reject
  // rather than silently skip.
  if (!identity.ipAddress && rules.length > 0) {
    return {
      allowed: false,
      reason:
        "無法識別此連線的來源 IP，無法套用連線來源規則，請檢查 TRUSTED_PROXY_MODE 與反向代理設定",
      rule: null
    }
  }

  const blockRule = rules.find((rule) => rule.action === "block" && ruleMatches(rule, identity))
  if (blockRule) {
    return {
      allowed: false,
      reason: blockRule.note || `此連線來源符合封鎖規則：${describeRuleTarget(blockRule)}`,
      rule: blockRule
    }
  }

  const allowRules = rules.filter((rule) => rule.action === "allow")
  if (allowRules.length > 0) {
    const allowRule = allowRules.find((rule) => ruleMatches(rule, identity))
    if (!allowRule) return { allowed: false, reason: "此連線來源不在允許清單內", rule: null }
  }

  return { allowed: true, reason: null, rule: null }
}

export async function getConnectionIdentity(
  headers: Headers,
  path?: string | null
): Promise<ConnectionIdentity> {
  const clientIp = getClientIpMetadata(headers)
  const ipinfo = await lookupIpinfo(clientIp.ipAddress)
  return {
    ipAddress: clientIp.ipAddress,
    ipCountry: clientIp.ipCountry ?? ipinfo.ipCountry ?? null,
    ipCountryName: ipinfo.ipCountryName ?? null,
    ipAsn: ipinfo.ipAsn ?? null,
    ipAsnName: ipinfo.ipAsnName ?? null,
    userAgent: headers.get("user-agent"),
    path: path ?? null
  }
}

export async function recordConnectionAccessBlock(
  identity: ConnectionIdentity,
  result: Awaited<ReturnType<typeof evaluateConnectionAccess>>
) {
  if (result.allowed) return
  try {
    await writeAuditLog({
      eventType: "connection_access_block",
      actorId: null,
      actorEmail: "system",
      target: {
        ipAddress: identity.ipAddress,
        ipCountry: identity.ipCountry,
        ipCountryName: identity.ipCountryName ?? null,
        ipAsn: identity.ipAsn ?? null,
        ipAsnName: identity.ipAsnName ?? null,
        userAgent: identity.userAgent ?? null,
        path: identity.path ?? null,
        matchedRule: result.rule
          ? {
              id: result.rule.id,
              action: result.rule.action,
              targetType: result.rule.targetType,
              value: result.rule.value,
              note: result.rule.note
            }
          : null
      },
      reason: result.reason
    })
  } catch (cause) {
    logger.error("connection_access_block_audit_failed", {
      error: cause instanceof Error ? cause.message : String(cause),
      identity,
      reason: result.reason
    })
  }
}

export async function checkConnectionAccess(headers: Headers, path?: string | null) {
  const identity = await getConnectionIdentity(headers, path)
  const result = await evaluateConnectionAccess(identity)
  if (!result.allowed) await recordConnectionAccessBlock(identity, result)
  return { identity, ...result }
}
