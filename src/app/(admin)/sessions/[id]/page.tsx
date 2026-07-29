import Link from "next/link"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { QRCodeDisplay } from "@/components/admin/QRCodeDisplay"
import { AttendanceTable } from "@/components/admin/AttendanceTable"
import { SessionControls } from "@/components/admin/SessionControls"
import { PageHeader } from "@/components/shared/PageHeader"

export default async function SessionPage(props: any) {
  const params = await props.params
  const session = await prisma.attendanceSession.findUnique({
    where: { id: params.id },
    include: {
      course: { include: { enrollments: { include: { student: true } } } },
      records: { include: { student: true } }
    }
  })
  if (!session) notFound()
  const sessionOrder = await prisma.attendanceSession.count({
    where: {
      courseId: session.courseId,
      createdAt: { lte: session.createdAt }
    }
  })
  const students = session.course.enrollments.map(({ student }) => ({
    id: student.id,
    studentCode: student.studentCode,
    name: student.name
  }))
  const records = session.records.map((record) => ({
    id: record.id,
    studentId: record.studentId,
    status: record.status,
    attendedAt: record.attendedAt?.toLocaleString("zh-TW", { timeZone: "Asia/Taipei" }) ?? null,
    ipAddress: record.ipAddress,
    ipCountry: record.ipCountry,
    ipCountryName: record.ipCountryName,
    userAgent: record.userAgent
  }))
  const initialCounts = {
    onTimeCount: session.records.filter((record) => record.status === "on_time").length,
    lateCount: session.records.filter((record) => record.status === "late").length,
    totalCount: session.records.length,
    enrolledCount: students.length
  }
  return (
    <main className="shell">
      <PageHeader
        eyebrow="即時點名"
        title={`${session.course.name} · 第 ${sessionOrder} 次`}
        description={`官方開始時間 ${session.officialStartTime.toLocaleString("zh-TW", {
          timeZone: "Asia/Taipei",
          hour12: false
        })}`}
        backHref={`/courses/${session.courseId}`}
        backLabel="返回課程"
      >
        <span className={`badge ${session.status}`}>
          {session.status === "active" && <span className="dot" aria-hidden />}
          {session.status === "active"
            ? "進行中"
            : session.status === "closed"
              ? "已關閉"
              : session.status === "voided"
                ? "已作廢"
                : session.status}
        </span>
        <Link className="btn secondary" href={`/sessions/${session.id}/display`} target="_blank">
          開啟投影模式 ↗
        </Link>
      </PageHeader>

      <div className="session-workspace-grid">
        <QRCodeDisplay sessionId={session.id} initialStatus={session.status} />
        <SessionControls
          sessionId={session.id}
          initialStatus={session.status}
          initialCounts={initialCounts}
          initialQrCodeValiditySeconds={session.qrCodeValiditySeconds}
          sessionOpenedAt={session.createdAt.toISOString()}
          autoExpireMinutes={session.autoExpireMinutes}
        />
      </div>
      <section className="panel data-panel">
        <div className="panel-header">
          <div>
            <h2>學生點名記錄</h2>
            <p>資料會即時更新；需要補登、請假或修正狀態時，請從每列右側操作。</p>
          </div>
          <span className="count-badge">{students.length} 位學生</span>
        </div>
        <AttendanceTable sessionId={session.id} records={records} students={students} />
      </section>
    </main>
  )
}
