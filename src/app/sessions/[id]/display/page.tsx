import { notFound, redirect } from "next/navigation"
import { QRCodeDisplay } from "@/components/admin/QRCodeDisplay"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sessionStatusLabel } from "@/lib/status-label"

export default async function SessionDisplayPage({ params }: any) {
  const sessionUser = await auth()
  if (!sessionUser?.user || sessionUser.user.role !== "admin") redirect("/login")

  const session = await prisma.attendanceSession.findUnique({
    where: { id: params.id },
    include: { course: true }
  })
  if (!session) notFound()

  const sessionOrder = await prisma.attendanceSession.count({
    where: {
      courseId: session.courseId,
      createdAt: { lte: session.createdAt }
    }
  })

  return (
    <main className="display-page">
      <header className="display-header">
        <div>
          <p className="display-eyebrow">課程點名 QR Code</p>
          <h1>{session.course.name}</h1>
          <p>
            第 {sessionOrder} 次點名 ·{" "}
            {session.officialStartTime.toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })}
          </p>
        </div>
        <span className={`badge ${session.status}`}>
          {session.status === "active" && <span className="dot" aria-hidden />}
          {sessionStatusLabel(session.status)}
        </span>
      </header>

      <section className="display-qr-stage" aria-label="QRCode 展示區">
        <QRCodeDisplay sessionId={session.id} initialStatus={session.status} />
      </section>
    </main>
  )
}
