"use client"

import { useEffect, useState, useTransition } from "react"
import { Dialog } from "@/components/shared/Dialog"

interface AuditLogRow {
  id: string
  eventType: string
  actorEmail: string
  target: unknown
  reason: string | null
  createdAt: string
}

const eventLabels: Record<string, string> = {
  export_attendance: "匯出點名資料",
  manual_attendance_override: "手動補登點名",
  leave_record_add: "新增請假記錄",
  void_session: "作廢點名 Session",
  role_change: "變更使用者角色",
  delete_student_data: "刪除學生個資",
  session_opened: "開啟點名",
  session_settings_update: "更新點名設定"
}

const targetLabels: Record<string, string> = {
  userId: "使用者 ID",
  courseId: "課程 ID",
  sessionId: "點名 Session ID",
  studentId: "學生 ID",
  studentCode: "學號",
  attendanceId: "點名記錄 ID",
  recordId: "點名記錄 ID"
}

function eventLabel(eventType: string) {
  return eventLabels[eventType] ?? eventType
}

function formatTarget(target: unknown) {
  if (!target || typeof target !== "object" || Array.isArray(target)) return String(target ?? "-")
  return Object.entries(target)
    .map(([key, value]) => `${targetLabels[key] ?? key}：${String(value)}`)
    .join("，")
}

function targetEntries(target: unknown) {
  if (!target || typeof target !== "object" || Array.isArray(target)) return [["目標", String(target ?? "-")]]
  return Object.entries(target).map(([key, value]) => [targetLabels[key] ?? key, String(value)])
}

export function AuditLogsClient({ initialLogs, initialTotal }: { initialLogs: AuditLogRow[]; initialTotal: number }) {
  const [logs, setLogs] = useState(initialLogs)
  const [total, setTotal] = useState(initialTotal)
  const [page, setPage] = useState(1)
  const [eventType, setEventType] = useState("")
  const [actorEmail, setActorEmail] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [selectedLog, setSelectedLog] = useState<AuditLogRow | null>(null)
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()
  const pageSize = 50

  async function load(nextPage = page) {
    setError("")
    const params = new URLSearchParams({ page: String(nextPage), pageSize: String(pageSize) })
    if (eventType) params.set("eventType", eventType)
    if (actorEmail) params.set("actorEmail", actorEmail)
    if (startDate) params.set("startDate", startDate)
    if (endDate) params.set("endDate", endDate)
    const response = await fetch(`/api/audit-logs?${params.toString()}`)
    const body = await response.json().catch(() => ({}))
    if (!response.ok) {
      setError(body.error ?? "查詢稽核日誌失敗")
      return
    }
    startTransition(() => {
      setLogs(body.logs ?? [])
      setTotal(body.total ?? 0)
      setPage(nextPage)
    })
  }

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void load(1)
    }, 400)
    return () => window.clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actorEmail])

  const maxPage = Math.max(1, Math.ceil(total / pageSize))

  return (
    <>
      <section className="panel toolbar">
        <select value={eventType} onChange={(event) => setEventType(event.target.value)}>
          <option value="">全部事件</option>
          <option value="session_opened">開啟點名</option>
          <option value="session_settings_update">更新點名設定</option>
          <option value="role_change">角色變更</option>
          <option value="export_attendance">匯出</option>
          <option value="manual_attendance_override">手動補登</option>
          <option value="leave_record_add">請假</option>
          <option value="void_session">作廢</option>
          <option value="delete_student_data">刪除個資</option>
        </select>
        <input placeholder="操作者 Email" value={actorEmail} onChange={(event) => setActorEmail(event.target.value)} />
        <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
        <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
        <button className="btn secondary" type="button" disabled={isPending} onClick={() => load(1)}>
          查詢
        </button>
      </section>
      {error && <p style={{ color: "#b42318" }}>{error}</p>}
      <table>
        <thead>
          <tr>
            <th>事件</th>
            <th>操作者</th>
            <th>目標</th>
            <th>原因</th>
            <th>時間</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id}>
              <td>
                <span className="badge">{eventLabel(log.eventType)}</span>
              </td>
              <td>{log.actorEmail}</td>
              <td>{formatTarget(log.target)}</td>
              <td>{log.reason ?? "-"}</td>
              <td>{log.createdAt}</td>
              <td>
                <button className="btn secondary" type="button" onClick={() => setSelectedLog(log)}>
                  詳情
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="toolbar">
        <button className="btn secondary" type="button" disabled={page <= 1 || isPending} onClick={() => load(page - 1)}>
          上一頁
        </button>
        <span>
          第 {page} / {maxPage} 頁，共 {total} 筆
        </span>
        <button
          className="btn secondary"
          type="button"
          disabled={page >= maxPage || isPending}
          onClick={() => load(page + 1)}
        >
          下一頁
        </button>
      </div>
      <Dialog title="稽核日誌詳情" open={selectedLog !== null} onClose={() => setSelectedLog(null)}>
        {selectedLog && (
          <div className="detail-grid">
            <div>
              <span>事件</span>
              <strong>{eventLabel(selectedLog.eventType)}</strong>
            </div>
            <div>
              <span>操作者</span>
              <strong>{selectedLog.actorEmail}</strong>
            </div>
            <div>
              <span>時間</span>
              <strong>{selectedLog.createdAt}</strong>
            </div>
            <div>
              <span>原因</span>
              <strong>{selectedLog.reason ?? "-"}</strong>
            </div>
            <div className="detail-wide">
              <span>目標資料</span>
              <table>
                <tbody>
                  {targetEntries(selectedLog.target).map(([label, value]) => (
                    <tr key={label}>
                      <th>{label}</th>
                      <td>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Dialog>
    </>
  )
}
