import { DataTable } from "@/components/shared/DataTable"

export function MyAttendanceTable({ rows }: { rows: any[] }) {
  return (
    <DataTable
      rows={rows}
      columns={[
        { key: "course", header: "課程", render: (row) => row.courseName },
        { key: "onTime", header: "準時", render: (row) => row.onTimeCount },
        { key: "late", header: "遲到", render: (row) => row.lateCount },
        { key: "leave", header: "請假", render: (row) => row.leaveCount },
        { key: "absent", header: "缺席", render: (row) => row.absentCount },
        { key: "rate", header: "出席率", render: (row) => <span className="badge">{row.attendanceRate}%</span> }
      ]}
    />
  )
}
