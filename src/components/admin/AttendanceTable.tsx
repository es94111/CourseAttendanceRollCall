"use client"

import { useRouter } from "next/navigation"
import { useMemo, useState, useTransition } from "react"

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
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()
  const recordByStudent = useMemo(
    () => new Map(records.map((record) => [record.studentId, record])),
    [records]
  )

  async function override(student: StudentRow, status: string) {
    setError("")
    const reason = window.prompt(`請輸入 ${student.name} 改為 ${status} 的原因`)
    if (!reason) return
    const existing = recordByStudent.get(student.id)
    const response = await fetch(`/api/attendance/${existing?.id ?? `manual-${sessionId}-${student.id}`}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        studentId: student.id,
        status,
        reason
      })
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) {
      setError(body.error ?? "出席狀態更新失敗")
      return
    }
    startTransition(() => router.refresh())
  }

  async function addLeave(student: StudentRow) {
    setError("")
    const reason = window.prompt(`請輸入 ${student.name} 的請假原因`)
    if (!reason) return
    const response = await fetch("/api/leave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, studentId: student.id, reason })
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) {
      setError(body.error ?? "新增請假失敗")
      return
    }
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
                  <span className="badge">{record?.status ?? "absent"}</span>
                </td>
                <td>{record?.attendedAt ?? "-"}</td>
                <td>{record?.ipAddress ?? "-"}</td>
                <td>{record?.userAgent ?? "-"}</td>
                <td>
                  <div className="toolbar">
                    <select
                      disabled={isPending}
                      value={record?.status ?? "absent"}
                      onChange={(event) => override(student, event.target.value)}
                    >
                      <option value="on_time">準時</option>
                      <option value="late">遲到</option>
                      <option value="leave">請假</option>
                      <option value="absent">缺席</option>
                    </select>
                    <button className="btn secondary" type="button" disabled={isPending} onClick={() => addLeave(student)}>
                      新增請假
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
