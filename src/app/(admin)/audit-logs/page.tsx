import { AuditLogsClient } from "@/components/admin/AuditLogsClient"
import { PageHeader } from "@/components/shared/PageHeader"
import { serializeAuditLogs } from "@/lib/audit-log-display"
import { prisma } from "@/lib/prisma"

export default async function AuditLogsPage() {
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.auditLog.count()
  ])
  return (
    <main className="shell">
      <PageHeader
        eyebrow="系統管理"
        title="稽核日誌"
        description="追蹤管理操作與重要狀態變更，供問題調查與安全稽核使用。"
      />
      <AuditLogsClient initialTotal={total} initialLogs={await serializeAuditLogs(logs)} />
    </main>
  )
}
