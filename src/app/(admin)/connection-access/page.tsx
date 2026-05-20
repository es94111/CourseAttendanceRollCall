import { ConnectionAccessManager } from "@/components/admin/ConnectionAccessManager"
import { prisma } from "@/lib/prisma"

export default async function ConnectionAccessPage() {
  const rules = await prisma.connectionAccessRule.findMany({
    orderBy: [{ action: "asc" }, { targetType: "asc" }, { value: "asc" }]
  })

  return (
    <main className="shell">
      <div className="page-heading">
        <div>
          <h1>連線限制</h1>
          <p>管理學生點名時允許或封鎖的來源國家與 IP。</p>
        </div>
      </div>
      <ConnectionAccessManager
        initialRules={rules.map((rule) => ({
          id: rule.id,
          action: rule.action as "allow" | "block",
          targetType: rule.targetType as "country" | "ip",
          value: rule.value,
          note: rule.note,
          enabled: rule.enabled
        }))}
      />
    </main>
  )
}
