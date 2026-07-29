import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { PageHeader } from "@/components/shared/PageHeader"

function formatTaipeiDateTime(date: Date) {
  return date.toLocaleString("zh-TW", { timeZone: "Asia/Taipei", hour12: false })
}

export default async function DashboardPage() {
  const [courseCount, activeSessions, activeSessionRows, studentCount, archivedCount] =
    await Promise.all([
      prisma.course.count({ where: { status: "active" } }),
      prisma.attendanceSession.count({ where: { status: "active" } }),
      prisma.attendanceSession.findMany({
        where: { status: "active" },
        include: {
          course: {
            include: {
              sessions: {
                select: { id: true },
                orderBy: { createdAt: "asc" }
              }
            }
          }
        },
        orderBy: { createdAt: "desc" },
        take: 8
      }),
      prisma.student.count(),
      prisma.course.count({ where: { status: "archived" } })
    ])

  const stats: Array<{
    label: string
    value: number
    href: string
    accent?: boolean
  }> = [
    { label: "進行中課程", value: courseCount, href: "/courses" },
    { label: "進行中點名", value: activeSessions, href: "/courses", accent: true },
    { label: "註冊學生", value: studentCount, href: "/students" },
    { label: "已封存課程", value: archivedCount, href: "/courses/archived" }
  ]

  return (
    <main className="shell">
      <PageHeader
        eyebrow="日常工作"
        title={`嗨，今天也準備好點名了`}
        description="先查看進行中的點名；若要開始新點名，請從對應課程進入。"
      >
        <Link className="btn secondary" href="/students">
          管理學生
        </Link>
        <Link className="btn" href="/courses">
          前往課程
        </Link>
      </PageHeader>

      <section className="stat-grid">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="stat-card group"
            style={{
              textDecoration: "none",
              transition: "transform 150ms cubic-bezier(0.16,1,0.3,1), box-shadow 150ms"
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              {stat.accent && activeSessions > 0 && (
                <span
                  aria-hidden
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "#16A34A",
                    animation: "pulse-dot 1.6s ease-in-out infinite"
                  }}
                />
              )}
              {stat.label}
            </span>
            <strong className="tabular">{stat.value}</strong>
          </Link>
        ))}
      </section>

      <section className="panel data-panel">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2>進行中點名</h2>
            <p className="text-muted" style={{ marginTop: -6, marginBottom: 14 }}>
              目前正在開放 QR Code 的課程
            </p>
          </div>
          <Link className="btn secondary" href="/courses">
            查看課程
          </Link>
        </div>
        {activeSessionRows.length === 0 ? (
          <div className="empty-state compact">
            <span className="empty-icon" aria-hidden>
              ✓
            </span>
            <h2>目前沒有進行中的點名</h2>
            <p>需要開始時，先前往課程並確認點名時間。</p>
            <Link className="btn" href="/courses">
              選擇課程
            </Link>
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>課程</th>
                  <th>第幾次點名</th>
                  <th>開放時間</th>
                  <th>結束時間</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {activeSessionRows.map((session) => {
                  const sessionOrder =
                    session.course.sessions.findIndex((item) => item.id === session.id) + 1
                  const closeAt = session.autoExpireMinutes
                    ? new Date(session.createdAt.getTime() + session.autoExpireMinutes * 60_000)
                    : null
                  return (
                    <tr key={session.id}>
                      <td>{session.course.name}</td>
                      <td>第 {sessionOrder} 次點名</td>
                      <td>{formatTaipeiDateTime(session.createdAt)}</td>
                      <td>{closeAt ? formatTaipeiDateTime(closeAt) : "未設定"}</td>
                      <td>
                        <Link className="btn secondary" href={`/sessions/${session.id}`}>
                          進入點名
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel">
        <h2>快速操作</h2>
        <p className="text-muted" style={{ marginBottom: 14 }}>
          常用功能入口
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <QuickLink
            href="/courses"
            title="新增課程"
            desc="建立課程並指派老師"
            icon={<path d="M12 5v14M5 12h14" />}
          />
          <QuickLink
            href="/students"
            title="匯入學生"
            desc="批次新增學生名冊"
            icon={
              <>
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <path d="M20 8v6" />
                <path d="M17 11h6" />
              </>
            }
          />
          <QuickLink
            href="/audit-logs"
            title="檢視稽核"
            desc="追蹤系統操作紀錄"
            icon={
              <>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6" />
                <path d="M9 13h6" />
                <path d="M9 17h6" />
              </>
            }
          />
        </div>
      </section>
    </main>
  )
}

function QuickLink({
  href,
  title,
  desc,
  icon
}: {
  href: string
  title: string
  desc: string
  icon: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="flex items-start gap-3 p-4 rounded-xl border border-primary-100 bg-primary-50/30 hover:bg-primary-50 hover:border-primary-300 transition-colors"
      style={{ textDecoration: "none" }}
    >
      <span
        className="inline-grid place-items-center w-9 h-9 rounded-lg bg-white text-primary-700 border border-primary-200 shrink-0"
        aria-hidden
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {icon}
        </svg>
      </span>
      <span className="min-w-0">
        <strong className="block text-primary-900 mb-0.5">{title}</strong>
        <span className="text-muted text-sm">{desc}</span>
      </span>
    </Link>
  )
}
