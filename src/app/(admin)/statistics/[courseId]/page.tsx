import { prisma } from "@/lib/prisma"
import { calculateStats } from "@/lib/attendance-stats"
import { StatisticsPanel } from "@/components/admin/StatisticsPanel"

export default async function StatisticsPage(props: any) {
  const params = await props.params;
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
      <StatisticsPanel
        courseId={params.courseId}
        initialRows={rows.map((row) => ({
          studentId: row.id,
          studentCode: row.studentCode,
          name: row.name,
          onTimeCount: row.onTimeCount,
          lateCount: row.lateCount,
          leaveCount: row.leaveCount,
          absentCount: row.absentCount,
          attendanceRate: row.attendanceRate
        }))}
        initialTotalSessions={course?.sessions.filter((session) => session.status !== "voided").length ?? 0}
      />
    </main>
  )
}
