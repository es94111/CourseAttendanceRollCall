import { ConnectionAccessManager } from "@/components/admin/ConnectionAccessManager"
import { PageHeader } from "@/components/shared/PageHeader"
import { prisma } from "@/lib/prisma"
import { getIpShareLimit } from "@/lib/system-settings"

export default async function ConnectionAccessPage() {
  const [rules, ipShareLimit] = await Promise.all([
    prisma.connectionAccessRule.findMany({
      orderBy: [{ action: "asc" }, { targetType: "asc" }, { value: "asc" }]
    }),
    getIpShareLimit()
  ])

  return (
    <main className="shell">
      <PageHeader
        eyebrow="系統管理"
        title="連線限制"
        description="管理學生點名時允許或封鎖的來源國家、IP 與 ASN。"
      />
      <ConnectionAccessManager
        initialRules={rules.map((rule) => ({
          id: rule.id,
          action: rule.action as "allow" | "block",
          targetType: rule.targetType as "country" | "ip" | "asn",
          value: rule.value,
          note: rule.note,
          enabled: rule.enabled
        }))}
        initialIpShareLimit={ipShareLimit}
      />
    </main>
  )
}
