"use client"

import { useEffect, useState, useTransition } from "react"
import { Dialog } from "@/components/shared/Dialog"

interface StatRow {
  studentId: string
  studentCode: string | null
  name: string
  onTimeCount: number
  lateCount: number
  leaveCount: number
  absentCount: number
  attendanceRate: number
}

export function StatisticsPanel({
  courseId,
  initialRows,
  initialTotalSessions
}: {
  courseId: string
  initialRows: StatRow[]
  initialTotalSessions: number
}) {
  const [rows, setRows] = useState(initialRows)
  const [totalSessions, setTotalSessions] = useState(initialTotalSessions)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [exportOpen, setExportOpen] = useState(false)
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    const source = new EventSource(`/api/courses/${courseId}/statistics/stream`)
    source.addEventListener("statistics_update", (event) => {
      const data = JSON.parse((event as MessageEvent).data)
      setRows(data.students ?? [])
      setTotalSessions(data.totalSessions ?? 0)
    })
    return () => source.close()
  }, [courseId])

  async function loadFiltered() {
    setError("")
    const params = new URLSearchParams()
    if (startDate) params.set("startDate", startDate)
    if (endDate) params.set("endDate", endDate)
    const response = await fetch(`/api/courses/${courseId}/statistics?${params.toString()}`)
    const body = await response.json().catch(() => ({}))
    if (!response.ok) {
      setError(body.error ?? "讀取統計失敗")
      return
    }
    startTransition(() => {
      setRows(body.students ?? [])
      setTotalSessions(body.totalSessions ?? 0)
    })
  }

  function openExportDialog() {
    setError("")
    setExportOpen(true)
  }

  function exportCsv() {
    const params = new URLSearchParams({ confirmed: "true" })
    if (startDate) params.set("startDate", startDate)
    if (endDate) params.set("endDate", endDate)
    window.location.href = `/api/courses/${courseId}/export?${params.toString()}`
    setExportOpen(false)
  }

  const filteredRows = rows.filter((row) => {
    if (statusFilter === "low") return row.attendanceRate < 80
    if (statusFilter === "absent") return row.absentCount > 0
    if (statusFilter === "late") return row.lateCount > 0
    return true
  })
  const averageRate = rows.length
    ? Math.round(rows.reduce((sum, row) => sum + row.attendanceRate, 0) / rows.length)
    : 0
  const lowAttendanceCount = rows.filter((row) => row.attendanceRate < 80).length
  const absentRiskCount = rows.filter((row) => row.absentCount >= 2).length

  return (
    <>
      <section className="panel">
        <div className="toolbar">
          <div className="field">
            <label>開始日期</label>
            <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          </div>
          <div className="field">
            <label>結束日期</label>
            <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          </div>
          <button className="btn secondary" type="button" disabled={isPending} onClick={loadFiltered}>
            套用篩選
          </button>
          <div className="field">
            <label>狀態篩選</label>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">全部學生</option>
              <option value="low">低出席率 (&lt; 80%)</option>
              <option value="absent">有缺席</option>
              <option value="late">有遲到</option>
            </select>
          </div>
          <button className="btn" type="button" onClick={openExportDialog}>
            匯出 CSV
          </button>
        </div>
        <div className="stat-grid">
          <div className="stat-card">
            <span>統計課次</span>
            <strong>{totalSessions}</strong>
          </div>
          <div className="stat-card">
            <span>平均出席率</span>
            <strong>{averageRate}%</strong>
          </div>
          <div className="stat-card">
            <span>低出席率</span>
            <strong>{lowAttendanceCount}</strong>
          </div>
          <div className="stat-card">
            <span>缺席風險</span>
            <strong>{absentRiskCount}</strong>
          </div>
        </div>
        {error && <p style={{ color: "#b42318" }}>{error}</p>}
      </section>
      {filteredRows.length === 0 ? (
        <div className="empty-state">目前篩選條件沒有統計資料</div>
      ) : (
      <table>
        <thead>
          <tr>
            <th>學號</th>
            <th>姓名</th>
            <th>準時</th>
            <th>遲到</th>
            <th>請假</th>
            <th>缺席</th>
            <th>出席率</th>
          </tr>
        </thead>
        <tbody>
          {filteredRows.map((row) => (
            <tr key={row.studentId}>
              <td>{row.studentCode ?? "-"}</td>
              <td>{row.name}</td>
              <td>{row.onTimeCount}</td>
              <td>{row.lateCount}</td>
              <td>{row.leaveCount}</td>
              <td>{row.absentCount}</td>
              <td>
                <span className="badge">{row.attendanceRate}%</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      )}
      <Dialog title="確認匯出個資 CSV" open={exportOpen} onClose={() => setExportOpen(false)}>
        <p>匯出的 CSV 含學生姓名、學號與出席資料。請確認你只會用於授權的課務或稽核目的。</p>
        <p>
          匯出範圍：
          {startDate || endDate ? `${startDate || "最早"} 至 ${endDate || "最新"}` : "全部時間"}
        </p>
        <div className="toolbar dialog-actions">
          <button className="btn secondary" type="button" onClick={() => setExportOpen(false)}>
            取消
          </button>
          <button className="btn" type="button" onClick={exportCsv}>
            確認匯出
          </button>
        </div>
      </Dialog>
    </>
  )
}
