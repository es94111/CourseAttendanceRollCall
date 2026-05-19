import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { calculateStats } from "@/lib/attendance-stats"
import { MyAttendanceTable } from "@/components/student/MyAttendanceTable"

export default async function MyAttendancePage() {
  const session = await auth()
  const student = await prisma.student.findFirst({
    where: { googleEmail: session?.user.email ?? "" },
    include: { records: true, enrollments: { include: { course: { include: { sessions: true } } } } }
  })
  const rows =
    student?.enrollments.map(({ course }) => {
      const stats = calculateStats(course.sessions, student.records).get(student.id)
      return {
        courseName: course.name,
        onTimeCount: stats?.onTimeCount ?? 0,
        lateCount: stats?.lateCount ?? 0,
        leaveCount: stats?.leaveCount ?? 0,
        absentCount: stats?.absentCount ?? course.sessions.length,
        attendanceRate: stats?.attendanceRate ?? 0
      }
    }) ?? []
  return (
    <main className="shell">
      <h1>我的出席記錄</h1>
      {rows.length === 0 ? <p className="panel">尚未加入任何課程</p> : <MyAttendanceTable rows={rows} />}
    </main>
  )
}
