"use client"

import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState, useTransition } from "react"

import { Dialog } from "@/components/shared/Dialog"
import { useToast } from "@/components/shared/ToastProvider"
import { formatIpLocation } from "@/lib/ip-format"

interface StudentRow {
  id: string
  studentCode: string
  name: string
}

interface AttendanceRow {
  id: string
  studentId: string
  status: string
  attendedAt: string | null
  ipAddress: string | null
  ipCountry: string | null
  ipCountryName: string | null
  userAgent: string | null
}

export function AttendanceTable({
  sessionId,
  records,
  students
}: {
  sessionId: string
  records: AttendanceRow[]
  students: StudentRow[]
}) {
  const router = useRouter()
  const { showToast } = useToast()
  const [error, setError] = useState("")
  const [rows, setRows] = useState(records)
  const [prevRecords, setPrevRecords] = useState(records)
  if (prevRecords !== records) {
    setPrevRecords(records)
    setRows(records)
  }
  const [overrideTarget, setOverrideTarget] = useState<{
    student: StudentRow
    status: string
  } | null>(null)
  const [leaveTarget, setLeaveTarget] = useState<StudentRow | null>(null)
  const [reason, setReason] = useState("")
  const [isPending, startTransition] = useTransition()
  const recordByStudent = useMemo(
    () => new Map(rows.map((record) => [record.studentId, record])),
    [rows]
  )

  async function refreshRecords() {
    const response = await fetch(`/api/sessions/${sessionId}`)
    if (!response.ok) return
    const body = await response.json().catch(() => ({}))
    const nextRows = (body.records ?? []).map(
      (record: AttendanceRow & { attendedAt?: string | null }) => ({
        id: record.id,
        studentId: record.studentId,
        status: record.status,
        attendedAt: record.attendedAt
          ? new Date(record.attendedAt).toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })
          : null,
        ipAddress: record.ipAddress,
        ipCountry: record.ipCountry,
        ipCountryName: record.ipCountryName,
        userAgent: record.userAgent
      })
    )
    setRows(nextRows)
  }

  useEffect(() => {
    const source = new EventSource(`/api/sessions/${sessionId}/stream`)
    source.addEventListener("attendance_count", () => {
      void refreshRecords()
    })
    source.addEventListener("session_status_changed", () => {
      source.close()
      void refreshRecords()
    })
    const interval = window.setInterval(() => {
      void refreshRecords()
    }, 10000)
    return () => {
      source.close()
      window.clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  async function override() {
    if (!overrideTarget) return
    const { student, status } = overrideTarget
    const trimmedReason = reason.trim()
    if (!trimmedReason) return
    setError("")
    const existing = recordByStudent.get(student.id)
    const response = await fetch(
      `/api/attendance/${existing?.id ?? `manual-${sessionId}-${student.id}`}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          studentId: student.id,
          status,
          reason: trimmedReason
        })
      }
    )
    const body = await response.json().catch(() => ({}))
    if (!response.ok) {
      setError(body.error ?? "出席狀態更新失敗")
      return
    }
    setOverrideTarget(null)
    setReason("")
    await refreshRecords()
    showToast("出席狀態已更新", "success")
    startTransition(() => router.refresh())
  }

  async function addLeave() {
    if (!leaveTarget) return
    const trimmedReason = reason.trim()
    if (!trimmedReason) return
    setError("")
    const response = await fetch("/api/leave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, studentId: leaveTarget.id, reason: trimmedReason })
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) {
      setError(body.error ?? "新增請假失敗")
      return
    }
    setLeaveTarget(null)
    setReason("")
    await refreshRecords()
    showToast("請假記錄已新增", "success")
    startTransition(() => router.refresh())
  }

  return (
    <div>
      {error && <p style={{ color: "#b42318" }}>{error}</p>}
      <table>
        <thead>
          <tr>
            <th>學號</th>
            <th>學生</th>
            <th>狀態</th>
            <th>時間</th>
            <th>IP</th>
            <th>IP 國家</th>
            <th>裝置</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {students.map((student) => {
            const record = recordByStudent.get(student.id)
            return (
              <tr key={student.id}>
                <td>{student.studentCode}</td>
                <td>{student.name}</td>
                <td>
                  <span className={`badge ${record?.status ?? "absent"}`}>
                    {(() => {
                      const status = record?.status ?? "absent"
                      if (status === "on_time") return "準時"
                      if (status === "late") return "遲到"
                      if (status === "leave") return "請假"
                      if (status === "absent") return "缺席"
                      return status
                    })()}
                  </span>
                </td>
                <td>{record?.attendedAt ?? "-"}</td>
                <td>{record?.ipAddress ?? "-"}</td>
                <td>{formatIpLocation(record?.ipCountry, record?.ipCountryName) || "-"}</td>
                <td>{record?.userAgent ?? "-"}</td>
                <td>
                  <div className="toolbar">
                    <select
                      disabled={isPending}
                      value={record?.status ?? "absent"}
                      onChange={(event) => {
                        setReason("")
                        setOverrideTarget({ student, status: event.target.value })
                      }}
                    >
                      <option value="on_time">準時</option>
                      <option value="late">遲到</option>
                      <option value="leave">請假</option>
                      <option value="absent">缺席</option>
                    </select>
                    <button
                      className="btn secondary"
                      type="button"
                      disabled={isPending}
                      onClick={() => {
                        setReason("")
                        setLeaveTarget(student)
                      }}
                    >
                      新增請假
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <Dialog
        title="覆寫出席狀態"
        open={overrideTarget !== null}
        onClose={() => setOverrideTarget(null)}
      >
        <p>
          將 {overrideTarget?.student.name} 改為 {overrideTarget?.status}
          。請留下原因，方便稽核追蹤。
        </p>
        <div className="field">
          <label>原因</label>
          <textarea rows={4} value={reason} onChange={(event) => setReason(event.target.value)} />
        </div>
        <div className="toolbar dialog-actions">
          <button
            className="btn secondary"
            type="button"
            disabled={isPending}
            onClick={() => setOverrideTarget(null)}
          >
            取消
          </button>
          <button
            className="btn"
            type="button"
            disabled={isPending || !reason.trim()}
            onClick={override}
          >
            確認更新
          </button>
        </div>
      </Dialog>
      <Dialog title="新增請假記錄" open={leaveTarget !== null} onClose={() => setLeaveTarget(null)}>
        <p>為 {leaveTarget?.name} 新增請假記錄。</p>
        <div className="field">
          <label>請假原因</label>
          <textarea rows={4} value={reason} onChange={(event) => setReason(event.target.value)} />
        </div>
        <div className="toolbar dialog-actions">
          <button
            className="btn secondary"
            type="button"
            disabled={isPending}
            onClick={() => setLeaveTarget(null)}
          >
            取消
          </button>
          <button
            className="btn"
            type="button"
            disabled={isPending || !reason.trim()}
            onClick={addLeave}
          >
            新增
          </button>
        </div>
      </Dialog>
    </div>
  )
}
