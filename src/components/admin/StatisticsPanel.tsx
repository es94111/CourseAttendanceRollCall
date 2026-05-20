"use client"

import { useEffect, useState, useTransition } from "react"

interface StatRow {
  studentId: string
  studentCode: string
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

  function exportCsv() {
    setError("")
    if (!startDate || !endDate) {
      setError("匯出前請選擇開始與結束日期")
      return
    }
    const confirmed = window.confirm("匯出的 CSV 含學生個資與出席資料，請確認只用於授權用途。")
    if (!confirmed) return
    const params = new URLSearchParams({ startDate, endDate, confirmed: "true" })
    window.location.href = `/api/courses/${courseId}/export?${params.toString()}`
  }

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
          <button className="btn" type="button" onClick={exportCsv}>
            匯出 CSV
          </button>
        </div>
        <p>統計課次：{totalSessions}</p>
        {error && <p style={{ color: "#b42318" }}>{error}</p>}
      </section>
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
          {rows.map((row) => (
            <tr key={row.studentId}>
              <td>{row.studentCode}</td>
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
    </>
  )
}
