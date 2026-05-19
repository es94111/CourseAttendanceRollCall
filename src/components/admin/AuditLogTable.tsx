import { DataTable } from "@/components/shared/DataTable"

export function AuditLogTable({ logs }: { logs: any[] }) {
  return (
    <DataTable
      rows={logs}
      columns={[
        { key: "event", header: "事件", render: (row) => <span className="badge">{row.eventType}</span> },
        { key: "actor", header: "操作者", render: (row) => row.actorEmail },
        { key: "target", header: "目標", render: (row) => JSON.stringify(row.target) },
        { key: "createdAt", header: "時間", render: (row) => row.createdAt }
      ]}
    />
  )
}
