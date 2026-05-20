import { prisma } from "@/lib/prisma"
import { AuditLogsClient } from "@/components/admin/AuditLogsClient"
import { serializeAuditLogs } from "@/lib/audit-log-display"

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
        initialLogs={await serializeAuditLogs(logs)}
      />
    </main>
  )
}
