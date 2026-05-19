import Link from "next/link"
import { prisma } from "@/lib/prisma"

export default async function DashboardPage() {
  const [courseCount, activeSessions, studentCount] = await Promise.all([
    prisma.course.count({ where: { status: "active" } }),
    prisma.attendanceSession.count({ where: { status: "active" } }),
    prisma.student.count()
  ])
  return (
    <main className="shell">
      <div className="toolbar">
        <h1>總覽</h1>
        <Link className="btn" href="/courses">
          管理課程
        </Link>
      </div>
      <section className="toolbar">
        <div className="panel">課程：{courseCount}</div>
        <div className="panel">進行中點名：{activeSessions}</div>
        <div className="panel">學生：{studentCount}</div>
      </section>
    </main>
  )
}
