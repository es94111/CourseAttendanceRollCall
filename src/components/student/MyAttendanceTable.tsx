"use client"

import { useMemo, useState } from "react"
import { attendanceStatusLabel } from "@/lib/status-label"

interface DetailRow {
  sessionId: string
  date: string
  status: string
  attendedAt: string | null
}

interface AttendanceSummaryRow {
  courseId: string
  courseName: string
  onTimeCount: number
  lateCount: number
  leaveCount: number
  absentCount: number
  attendanceRate: number
  details: DetailRow[]
}

export function MyAttendanceTable({ rows }: { rows: AttendanceSummaryRow[] }) {
  const [courseQuery, setCourseQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [expanded, setExpanded] = useState<string | null>(rows[0]?.courseId ?? null)

  const filteredRows = useMemo(() => {
    const needle = courseQuery.trim().toLowerCase()
    return rows.filter((row) => {
      const matchesCourse = !needle || row.courseName.toLowerCase().includes(needle)
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "low" && row.attendanceRate < 80) ||
        (statusFilter === "absent" && row.absentCount > 0) ||
        (statusFilter === "late" && row.lateCount > 0)
      return matchesCourse && matchesStatus
    })
  }, [courseQuery, rows, statusFilter])

  return (
    <>
      <section className="panel attendance-filter">
        <div className="search-field">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-4-4" />
          </svg>
          <label className="sr-only" htmlFor="attendance-course-search">
            搜尋課程
          </label>
          <input
            id="attendance-course-search"
            type="search"
            placeholder="搜尋課程"
            value={courseQuery}
            onChange={(event) => setCourseQuery(event.target.value)}
          />
        </div>
        <div className="filter-select">
          <label htmlFor="attendance-status-filter">顯示</label>
          <select
            id="attendance-status-filter"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">全部課程</option>
            <option value="low">出席率低於 80%</option>
            <option value="absent">有缺席</option>
            <option value="late">有遲到</option>
          </select>
        </div>
      </section>
      {filteredRows.length === 0 ? (
        <div className="empty-state">沒有符合條件的出席記錄</div>
      ) : (
        <div className="attendance-cards">
          {filteredRows.map((row) => (
            <section className="panel attendance-course-card" key={row.courseId}>
              <div className="attendance-card-header">
                <div>
                  <h2>{row.courseName}</h2>
                  <p className="text-muted">共 {row.details.length} 次點名紀錄</p>
                </div>
                <div className={`attendance-rate ${row.attendanceRate < 80 ? "warning" : ""}`}>
                  <strong>{row.attendanceRate}%</strong>
                  <span>出席率</span>
                </div>
                <button
                  className="btn secondary"
                  type="button"
                  aria-expanded={expanded === row.courseId}
                  onClick={() => setExpanded(expanded === row.courseId ? null : row.courseId)}
                >
                  {expanded === row.courseId ? "收合明細" : "查看明細"}
                </button>
              </div>
              <div className="stat-grid compact">
                <div className="stat-card">
                  <span>準時</span>
                  <strong>{row.onTimeCount}</strong>
                </div>
                <div className="stat-card">
                  <span>遲到</span>
                  <strong>{row.lateCount}</strong>
                </div>
                <div className="stat-card">
                  <span>請假</span>
                  <strong>{row.leaveCount}</strong>
                </div>
                <div className="stat-card">
                  <span>缺席</span>
                  <strong>{row.absentCount}</strong>
                </div>
              </div>
              {expanded === row.courseId && (
                <div className="table-scroll attendance-details">
                  <table>
                    <thead>
                      <tr>
                        <th>課次時間</th>
                        <th>狀態</th>
                        <th>點名時間</th>
                      </tr>
                    </thead>
                    <tbody>
                      {row.details.map((detail) => (
                        <tr key={detail.sessionId}>
                          <td>{detail.date}</td>
                          <td>
                            <span className={`badge ${detail.status}`}>
                              {attendanceStatusLabel(detail.status)}
                            </span>
                          </td>
                          <td>{detail.attendedAt ?? "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </>
  )
}
