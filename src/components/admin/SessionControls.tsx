"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState, useTransition } from "react"
import { Dialog } from "@/components/shared/Dialog"
import { useToast } from "@/components/shared/ToastProvider"

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
  const { showToast } = useToast()
  const [status, setStatus] = useState(initialStatus)
  const [counts, setCounts] = useState(initialCounts)
  const [error, setError] = useState("")
  const [closeOpen, setCloseOpen] = useState(false)
  const [voidOpen, setVoidOpen] = useState(false)
  const [voidReason, setVoidReason] = useState("")
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
      return false
    }
    startTransition(() => router.refresh())
    return true
  }

  async function closeSession() {
    const ok = await post(`/api/sessions/${sessionId}/close`)
    if (!ok) return
    setStatus("closed")
    setCloseOpen(false)
    showToast("點名已關閉", "success")
  }

  async function voidSession() {
    const reason = voidReason.trim()
    if (!reason) return
    const ok = await post(`/api/sessions/${sessionId}/void`, { reason })
    if (!ok) return
    setStatus("voided")
    setVoidOpen(false)
    setVoidReason("")
    showToast("Session 已作廢", "success")
  }

  const finished = status !== "active"

  return (
    <section className={`panel ${finished ? "session-ended" : ""}`}>
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
          {finished && (
            <p>
              本次 Session 已{status === "closed" ? "關閉" : status === "voided" ? "作廢" : "結束"}，QR Code 已停用。
            </p>
          )}
        </div>
        <div className="toolbar">
          <button className="btn secondary" type="button" disabled={isPending || status !== "active"} onClick={() => setCloseOpen(true)}>
            關閉點名
          </button>
          <button className="btn secondary" type="button" disabled={isPending || status !== "closed"} onClick={() => setVoidOpen(true)}>
            作廢 Session
          </button>
        </div>
      </div>
      {error && <p style={{ color: "#b42318" }}>{error}</p>}
      <Dialog title="關閉點名" open={closeOpen} onClose={() => setCloseOpen(false)}>
        <p>關閉後學生將無法再使用目前 QR Code 點名。確定要關閉本次點名？</p>
        <div className="toolbar dialog-actions">
          <button className="btn secondary" type="button" disabled={isPending} onClick={() => setCloseOpen(false)}>
            取消
          </button>
          <button className="btn" type="button" disabled={isPending} onClick={closeSession}>
            確認關閉
          </button>
        </div>
      </Dialog>
      <Dialog title="作廢 Session" open={voidOpen} onClose={() => setVoidOpen(false)}>
        <div className="field">
          <label>作廢原因</label>
          <textarea value={voidReason} onChange={(event) => setVoidReason(event.target.value)} rows={4} />
        </div>
        <div className="toolbar dialog-actions">
          <button className="btn secondary" type="button" disabled={isPending} onClick={() => setVoidOpen(false)}>
            取消
          </button>
          <button className="btn" type="button" disabled={isPending || !voidReason.trim()} onClick={voidSession}>
            確認作廢
          </button>
        </div>
      </Dialog>
    </section>
  )
}
