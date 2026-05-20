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
      <div className="toolbar">
        <h1>{session.course.name} 點名</h1>
        <span className="badge">{session.status}</span>
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
