import { prisma } from "@/lib/prisma"
import { AuditLogTable } from "@/components/admin/AuditLogTable"

export default async function AuditLogsPage() {
  const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 50 })
  return (
    <main className="shell">
      <h1>稽核日誌</h1>
      <section className="panel toolbar">
        <select>
          <option value="">全部事件</option>
          <option value="role_change">角色變更</option>
          <option value="export_attendance">匯出</option>
        </select>
        <input placeholder="操作者 Email" />
        <input type="date" />
        <input type="date" />
      </section>
      <AuditLogTable logs={logs} />
    </main>
  )
}
