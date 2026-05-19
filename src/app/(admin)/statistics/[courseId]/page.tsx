import { prisma } from "@/lib/prisma"
import { DataTable } from "@/components/shared/DataTable"
import { calculateStats } from "@/lib/attendance-stats"

export default async function StatisticsPage({ params }: any) {
  const course = await prisma.course.findUnique({
    where: { id: params.courseId },
    include: {
      sessions: true,
      enrollments: { include: { student: { include: { records: true } } } }
    }
  })
  const rows =
    course?.enrollments.map(({ student }) => ({
      ...student,
      ...(calculateStats(course.sessions, student.records).get(student.id) ?? {
        onTimeCount: 0,
        lateCount: 0,
        leaveCount: 0,
        absentCount: course.sessions.length,
        attendanceRate: 0
      })
    })) ?? []
  return (
    <main className="shell">
      <h1>{course?.name ?? "課程"} 出席統計</h1>
      <div className="panel">
        <button className="btn" type="button">
          匯出 CSV
        </button>
      </div>
      <DataTable
        rows={rows}
        columns={[
          { key: "code", header: "學號", render: (row) => row.studentCode },
          { key: "name", header: "姓名", render: (row) => row.name },
          { key: "on", header: "準時", render: (row) => row.onTimeCount },
          { key: "late", header: "遲到", render: (row) => row.lateCount },
          { key: "leave", header: "請假", render: (row) => row.leaveCount },
          { key: "absent", header: "缺席", render: (row) => row.absentCount },
          { key: "rate", header: "出席率", render: (row) => <span className="badge">{row.attendanceRate}%</span> }
        ]}
      />
    </main>
  )
}
