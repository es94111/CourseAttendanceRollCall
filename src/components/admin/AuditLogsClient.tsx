"use client"

import { useEffect, useState, useTransition } from "react"
import { Dialog } from "@/components/shared/Dialog"
import {
  type AuditLogRow,
  auditChangeEntries,
  auditTargetEntries,
  eventLabel,
  formatAuditDescription,
  formatDateTime
} from "@/lib/audit-log-format"

export function AuditLogsClient({
  initialLogs,
  initialTotal
}: {
  initialLogs: AuditLogRow[]
  initialTotal: number
}) {
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

  // biome-ignore lint/correctness/useExhaustiveDependencies: load 為閉包，僅應在篩選條件變動時重新載入
  useEffect(() => {
    const handle = window.setTimeout(() => {
      void load(1)
    }, 400)
    return () => window.clearTimeout(handle)
  }, [actorEmail])

  const maxPage = Math.max(1, Math.ceil(total / pageSize))
  const selectedChanges = selectedLog ? auditChangeEntries(selectedLog) : []

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
          <option value="connection_access_block">封鎖連線</option>
          <option value="allowed_email_domains_update">登入網域</option>
          <option value="manual_attendance_override">手動補登</option>
          <option value="leave_record_add">請假</option>
          <option value="void_session">作廢</option>
          <option value="delete_student_data">刪除個資</option>
          <option value="delete_user">刪除使用者</option>
        </select>
        <input
          placeholder="操作者 Email"
          value={actorEmail}
          onChange={(event) => setActorEmail(event.target.value)}
        />
        <input
          type="date"
          value={startDate}
          onChange={(event) => setStartDate(event.target.value)}
        />
        <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
        <button
          className="btn secondary"
          type="button"
          disabled={isPending}
          onClick={() => load(1)}
        >
          查詢
        </button>
      </section>
      {error && <p style={{ color: "#b42318" }}>{error}</p>}
      <div className="table-scroll audit-log-table">
        <table>
          <thead>
            <tr>
              <th>事件</th>
              <th>操作者</th>
              <th>摘要</th>
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
                <td className="audit-log-summary">{formatAuditDescription(log)}</td>
                <td>{log.reason ?? "未填寫原因"}</td>
                <td>{formatDateTime(log.createdAt)}</td>
                <td>
                  <button
                    className="btn secondary"
                    type="button"
                    onClick={() => setSelectedLog(log)}
                  >
                    詳情
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="toolbar">
        <button
          className="btn secondary"
          type="button"
          disabled={page <= 1 || isPending}
          onClick={() => load(page - 1)}
        >
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
            <div className="detail-wide audit-detail-summary">
              <span>變更摘要</span>
              <strong>{formatAuditDescription(selectedLog)}</strong>
            </div>
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
              <span>對象</span>
              <table className="audit-detail-table">
                <tbody>
                  {auditTargetEntries(selectedLog).map(([label, value]) => (
                    <tr key={label}>
                      <th>{label}</th>
                      <td className={label.endsWith("ID") ? "audit-identifier" : undefined}>
                        {value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {selectedChanges.length > 0 && (
              <div className="detail-wide">
                <span>變更內容</span>
                <table className="audit-detail-table">
                  <thead>
                    <tr>
                      <th>欄位</th>
                      <th>變更前</th>
                      <th>變更後</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedChanges.map((change) => (
                      <tr key={change.key}>
                        <th>{change.label}</th>
                        <td>{change.oldValue}</td>
                        <td>
                          <strong>{change.newValue}</strong>
                        </td>
                      </tr>
                    ))}
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
