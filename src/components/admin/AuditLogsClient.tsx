"use client"

import { useEffect, useState, useTransition } from "react"
import { Dialog } from "@/components/shared/Dialog"

interface AuditLogRow {
  id: string
  eventType: string
  actorEmail: string
  target: unknown
  oldValue?: unknown
  newValue?: unknown
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
  session_settings_update: "更新點名設定",
  connection_access_update: "更新連線限制"
}

const targetLabels: Record<string, string> = {
  userId: "使用者 ID",
  courseId: "課程 ID",
  sessionId: "點名 Session ID",
  studentId: "學生 ID",
  studentCode: "學號",
  attendanceId: "點名記錄 ID",
  attendanceRecordId: "點名記錄 ID",
  recordId: "點名記錄 ID",
  leaveRecordId: "請假記錄 ID",
  startDate: "開始日期",
  endDate: "結束日期",
  total: "筆數"
}

const targetDisplayKeys = new Set(["courseName", "sessionLabel", "userDisplay"])

function eventLabel(eventType: string) {
  return eventLabels[eventType] ?? eventType
}

function targetObject(target: unknown) {
  if (!target || typeof target !== "object" || Array.isArray(target)) return String(target ?? "-")
  return target as Record<string, unknown>
}

function valueObject(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function formatTarget(log: AuditLogRow) {
  const target = targetObject(log.target)
  if (typeof target === "string") return target
  const courseName = String(target.courseName ?? "此課程")
  const sessionLabel = String(target.sessionLabel ?? "此點名 Session")
  const userDisplay = String(target.userDisplay ?? "此使用者")

  switch (log.eventType) {
    case "session_opened":
      return `開啟課程「${courseName}」的${sessionLabel}`
    case "session_settings_update":
      return `更新課程「${courseName}」${sessionLabel}的設定`
    case "manual_attendance_override":
      return "手動調整一筆點名記錄"
    case "delete_student_data":
      return target.studentCode ? `刪除學號 ${target.studentCode} 的學生個資` : "刪除學生個資"
    case "export_attendance": {
      const range =
        target.startDate === "全部時間" && target.endDate === "全部時間"
          ? "全部時間"
          : `${target.startDate ?? "最早"} 至 ${target.endDate ?? "最新"}`
      return `匯出課程「${courseName}」${range} 的點名資料，共 ${target.total ?? "-"} 筆`
    }
    case "leave_record_add":
      return "新增請假記錄並更新點名狀態"
    case "role_change":
      return `變更 ${userDisplay} 的角色`
    case "void_session":
      return `課程「${courseName}」作廢${sessionLabel}`
    case "connection_access_update":
      return `更新連線限制規則，共 ${target.total ?? "-"} 筆`
    default:
      return targetEntries(target)
        .map(([key, value]) => `${key}：${value}`)
        .join("，")
  }
}

function formatDescription(log: AuditLogRow) {
  if (log.eventType === "session_settings_update") {
    const oldValue = valueObject(log.oldValue)
    const newValue = valueObject(log.newValue)
    if ("qrCodeValiditySeconds" in oldValue || "qrCodeValiditySeconds" in newValue) {
      return `將 QR Code 有效秒數由 ${oldValue.qrCodeValiditySeconds ?? "-"} 秒更新為 ${newValue.qrCodeValiditySeconds ?? "-"} 秒`
    }
  }
  return formatTarget(log)
}

function targetEntries(target: unknown) {
  if (!target || typeof target !== "object" || Array.isArray(target)) return [["目標", String(target ?? "-")]]
  const record = target as Record<string, unknown>
  return Object.entries(record)
    .filter(([key]) => !targetDisplayKeys.has(key))
    .map(([key, value]) => {
      if (key === "courseId" && record.courseName) return ["課程", String(record.courseName)]
      if (key === "sessionId" && record.sessionLabel) return ["點名", String(record.sessionLabel)]
      if (key === "userId" && record.userDisplay) return ["使用者", String(record.userDisplay)]
      return [targetLabels[key] ?? key, String(value)]
    })
}

const valueLabels: Record<string, string> = {
  qrCodeValiditySeconds: "QR Code 有效秒數",
  gracePeriodSeconds: "OAuth 寬限秒數",
  officialStartTime: "官方開始時間",
  role: "角色",
  status: "點名狀態"
}

function valueEntries(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return []
  return Object.entries(value).map(([key, item]) => [valueLabels[key] ?? key, String(item)])
}

function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const parts = new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? ""
  return `${part("year")}/${part("month")}/${part("day")} ${part("hour")}:${part("minute")}:${part("second")}`
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
          <option value="connection_access_update">連線限制</option>
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
              <td>{formatDescription(log)}</td>
              <td>{log.reason ?? "未填寫原因"}</td>
              <td>{formatDateTime(log.createdAt)}</td>
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
              <strong>{formatDateTime(selectedLog.createdAt)}</strong>
            </div>
            <div>
              <span>原因</span>
              <strong>{selectedLog.reason ?? "未填寫原因"}</strong>
            </div>
            <div className="detail-wide">
              <span>說明</span>
              <strong>{formatDescription(selectedLog)}</strong>
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
            {(valueEntries(selectedLog.oldValue).length > 0 || valueEntries(selectedLog.newValue).length > 0) && (
              <div className="detail-wide">
                <span>變更內容</span>
                <table>
                  <thead>
                    <tr>
                      <th>欄位</th>
                      <th>原本</th>
                      <th>更新後</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(
                      new Set([
                        ...valueEntries(selectedLog.oldValue).map(([label]) => label),
                        ...valueEntries(selectedLog.newValue).map(([label]) => label)
                      ])
                    ).map((label) => {
                      const oldValue = valueEntries(selectedLog.oldValue).find(([item]) => item === label)?.[1] ?? "-"
                      const newValue = valueEntries(selectedLog.newValue).find(([item]) => item === label)?.[1] ?? "-"
                      return (
                        <tr key={label}>
                          <th>{label}</th>
                          <td>{oldValue}</td>
                          <td>{newValue}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Dialog>
    </>
  )
}
