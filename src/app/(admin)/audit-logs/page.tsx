import { prisma } from "@/lib/prisma"
import { AuditLogsClient } from "@/components/admin/AuditLogsClient"
import { toTaipeiIso } from "@/lib/time"

export default async function AuditLogsPage() {
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.auditLog.count()
  ])
  return (
    <main className="shell">
      <h1>稽核日誌</h1>
      <AuditLogsClient
        initialTotal={total}
        initialLogs={logs.map((log) => ({
          id: log.id,
          eventType: log.eventType,
          actorEmail: log.actorEmail,
          target: log.target,
          reason: log.reason,
          createdAt: toTaipeiIso(log.createdAt) ?? ""
        }))}
      />
    </main>
  )
}
