import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { QRCodeDisplay } from "@/components/admin/QRCodeDisplay"
import { AttendanceTable } from "@/components/admin/AttendanceTable"

export default async function SessionPage({ params }: any) {
  const session = await prisma.attendanceSession.findUnique({
    where: { id: params.id },
    include: { course: true, records: { include: { student: true } } }
  })
  if (!session) notFound()
  return (
    <main className="shell">
      <div className="toolbar">
        <h1>{session.course.name} 點名</h1>
        <span className="badge">{session.status}</span>
      </div>
      <QRCodeDisplay sessionId={session.id} />
      <section className="panel">
        <h2>點名記錄</h2>
        <AttendanceTable records={session.records} />
      </section>
    </main>
  )
}
