import { error, handleRouteError, json, parseJson, requireAdmin } from "@/lib/api"
import { extractEmailDomain, normalizeEmailDomain } from "@/lib/auth-domain"
import { prisma } from "@/lib/prisma"
import { allowedEmailDomainsSchema } from "@/lib/validation"
import { writeAuditLog } from "@/lib/audit"

export async function GET() {
  const guard = await requireAdmin()
  if ("response" in guard) return guard.response
  try {
    const domains = await prisma.allowedEmailDomain.findMany({ orderBy: { domain: "asc" } })
    return json({ domains })
  } catch (cause) {
    return handleRouteError(cause)
  }
}

export async function PUT(request: Request) {
  const guard = await requireAdmin()
  if ("response" in guard) return guard.response
  const parsed = await parseJson(request, allowedEmailDomainsSchema)
  if ("response" in parsed) return parsed.response
  try {
    const normalized: { domain: string; note: string | null }[] = []
    for (const input of parsed.data.domains) {
      const domain = normalizeEmailDomain(input.domain)
      if (!domain) return error(`網域格式不正確：${input.domain}`, 400)
      normalized.push({ domain, note: input.note?.trim() || null })
    }
    const domains = Array.from(new Map(normalized.map((item) => [item.domain, item])).values())

    if (domains.length > 0) {
      const actorDomain = extractEmailDomain(guard.user.email)
      const allowedSet = new Set(domains.map((item) => item.domain))
      if (!actorDomain || !allowedSet.has(actorDomain)) {
        return error(
          "儲存後將鎖住自己（你的 Email 網域不在清單內），請先把自己的網域加入或保留空清單。",
          400
        )
      }
    }

    const oldDomains = await prisma.allowedEmailDomain.findMany({ orderBy: { domain: "asc" } })
    await prisma.$transaction(async (tx) => {
      await tx.allowedEmailDomain.deleteMany()
      if (domains.length > 0) {
        await tx.allowedEmailDomain.createMany({ data: domains })
      }
    })
    await writeAuditLog({
      eventType: "allowed_email_domains_update",
      actorId: guard.user.id,
      actorEmail: guard.user.email ?? "",
      target: { total: domains.length },
      oldValue: oldDomains.map(({ domain, note }) => ({ domain, note })),
      newValue: domains
    })
    return json({ domains })
  } catch (cause) {
    return handleRouteError(cause)
  }
}
