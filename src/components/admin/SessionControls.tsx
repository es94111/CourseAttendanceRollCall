"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState, useTransition } from "react"

interface Counts {
  onTimeCount: number
  lateCount: number
  totalCount: number
  enrolledCount: number
  latest?: {
    studentName: string
    studentCode: string
    status: string
    attendedAt: string | null
  } | null
}

export function SessionControls({
  sessionId,
  initialStatus,
  initialCounts
}: {
  sessionId: string
  initialStatus: string
  initialCounts: Counts
}) {
  const router = useRouter()
  const [status, setStatus] = useState(initialStatus)
  const [counts, setCounts] = useState(initialCounts)
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (status !== "active") return
    const source = new EventSource(`/api/sessions/${sessionId}/stream`)
    source.addEventListener("attendance_count", (event) => {
      setCounts(JSON.parse((event as MessageEvent).data))
    })
    source.addEventListener("session_status_changed", (event) => {
      const data = JSON.parse((event as MessageEvent).data)
      setStatus(data.newStatus)
      source.close()
      startTransition(() => router.refresh())
    })
    return () => source.close()
  }, [router, sessionId, status])

  async function post(path: string, body?: unknown) {
    setError("")
    const response = await fetch(path, {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      setError(payload.error ?? "操作失敗")
      return
    }
    startTransition(() => router.refresh())
  }

  async function closeSession() {
    if (!window.confirm("確定要關閉本次點名？")) return
    await post(`/api/sessions/${sessionId}/close`)
    setStatus("closed")
  }

  async function voidSession() {
    const reason = window.prompt("請輸入作廢原因")
    if (!reason) return
    await post(`/api/sessions/${sessionId}/void`, { reason })
    setStatus("voided")
  }

  return (
    <section className="panel">
      <div className="toolbar">
        <div>
          <h2>即時點名狀態</h2>
          <p>
            已點名 {counts.totalCount} / {counts.enrolledCount}，準時 {counts.onTimeCount}，遲到{" "}
            {counts.lateCount}
          </p>
          {counts.latest && (
            <p>
              最新：{counts.latest.studentCode} {counts.latest.studentName} ({counts.latest.status})
            </p>
          )}
        </div>
        <div className="toolbar">
          <button className="btn secondary" type="button" disabled={isPending || status !== "active"} onClick={closeSession}>
            關閉點名
          </button>
          <button className="btn secondary" type="button" disabled={isPending || status === "active"} onClick={voidSession}>
            作廢 Session
          </button>
        </div>
      </div>
      {error && <p style={{ color: "#b42318" }}>{error}</p>}
    </section>
  )
}
