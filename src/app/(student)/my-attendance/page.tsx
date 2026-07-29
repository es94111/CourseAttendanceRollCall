import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { calculateStats } from "@/lib/attendance-stats"
import { MyAttendanceTable } from "@/components/student/MyAttendanceTable"
import { normalizeEmail } from "@/lib/email"
import { PageHeader } from "@/components/shared/PageHeader"

export default async function MyAttendancePage() {
  const session = await auth()
  const student = await prisma.student.findFirst({
    where: {
      googleEmail: { equals: normalizeEmail(session?.user.email) ?? "", mode: "insensitive" }
    },
    include: {
      records: true,
      enrollments: { include: { course: { include: { sessions: true } } } }
    }
  })
  const rows =
    student?.enrollments.map(({ course }) => {
      const stats = calculateStats(course.sessions, student.records).get(student.id)
      return {
        courseId: course.id,
        courseName: course.name,
        onTimeCount: stats?.onTimeCount ?? 0,
        lateCount: stats?.lateCount ?? 0,
        leaveCount: stats?.leaveCount ?? 0,
        absentCount: stats?.absentCount ?? course.sessions.length,
        attendanceRate: stats?.attendanceRate ?? 0,
        details: course.sessions
          .map((attendanceSession) => {
            const record = student.records.find((item) => item.sessionId === attendanceSession.id)
            return {
              sessionId: attendanceSession.id,
              date: attendanceSession.officialStartTime.toLocaleString("zh-TW", {
                timeZone: "Asia/Taipei"
              }),
              status: record?.status ?? "absent",
              attendedAt:
                record?.attendedAt?.toLocaleString("zh-TW", { timeZone: "Asia/Taipei" }) ?? null
            }
          })
          .sort((a, b) => b.date.localeCompare(a.date))
      }
    }) ?? []
  return (
    <main className="shell">
      <PageHeader
        eyebrow="學生專區"
        title="我的出席記錄"
        description="查看各課程的出席率、遲到與缺席明細；若紀錄有誤，請聯絡課程管理員。"
      />
      {rows.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon" aria-hidden>
            ○
          </span>
          <h2>尚未加入任何課程</h2>
          <p>管理員將你加入課程後，出席紀錄會顯示在這裡。</p>
        </div>
      ) : (
        <MyAttendanceTable rows={rows} />
      )}
    </main>
  )
}
