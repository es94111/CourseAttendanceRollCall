import { DataTable } from "@/components/shared/DataTable"

export function AttendanceTable({ records }: { records: any[] }) {
  return (
    <DataTable
      rows={records}
      columns={[
        { key: "student", header: "學生", render: (row) => row.student?.name ?? row.studentId },
        { key: "status", header: "狀態", render: (row) => <span className="badge">{row.status}</span> },
        { key: "attendedAt", header: "時間", render: (row) => row.attendedAt ?? "-" },
        { key: "ip", header: "IP", render: (row) => row.ipAddress ?? "-" },
        { key: "ua", header: "裝置", render: (row) => row.userAgent ?? "-" }
      ]}
    />
  )
}
