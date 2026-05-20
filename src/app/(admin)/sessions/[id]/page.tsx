import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { QRCodeDisplay } from "@/components/admin/QRCodeDisplay"
import { AttendanceTable } from "@/components/admin/AttendanceTable"
import { SessionControls } from "@/components/admin/SessionControls"

export default async function SessionPage({ params }: any) {
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
      <div className="page-heading">
        <div>
          <h1>{session.course.name} 點名</h1>
          <p>
            第 {sessionOrder} 次點名 ·{" "}
            {session.officialStartTime.toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })}
          </p>
        </div>
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
      </div>
      <QRCodeDisplay sessionId={session.id} initialStatus={session.status} />
      <SessionControls
        sessionId={session.id}
        initialStatus={session.status}
        initialCounts={initialCounts}
        initialQrCodeValiditySeconds={session.qrCodeValiditySeconds}
      />
      <section className="panel">
        <h2>點名記錄</h2>
        <AttendanceTable sessionId={session.id} records={records} students={students} />
      </section>
    </main>
  )
}
