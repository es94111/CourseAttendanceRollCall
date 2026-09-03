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
    studentCode: string | null
    status: string
    attendedAt: string | null
  } | null
}

export function SessionControls({
  sessionId,
  initialStatus,
  initialCounts,
  initialQrCodeValiditySeconds,
  sessionOpenedAt,
  autoExpireMinutes
}: {
  sessionId: string
  initialStatus: string
  initialCounts: Counts
  initialQrCodeValiditySeconds: number
  sessionOpenedAt: string
  autoExpireMinutes: number | null
}) {
  const router = useRouter()
  const { showToast } = useToast()
  const [status, setStatus] = useState(initialStatus)
  const [counts, setCounts] = useState(initialCounts)
  const [error, setError] = useState("")
  const [closeOpen, setCloseOpen] = useState(false)
  const [voidOpen, setVoidOpen] = useState(false)
  const [voidReason, setVoidReason] = useState("")
  const [reopenOpen, setReopenOpen] = useState(false)
  const [qrCodeValiditySeconds, setQrCodeValiditySeconds] = useState(
    String(initialQrCodeValiditySeconds)
  )
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false)
  const [now, setNow] = useState(() => Date.now())
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

  useEffect(() => {
    if (status !== "active" || !autoExpireMinutes) return
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [autoExpireMinutes, status])

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

  async function updateQrCodeValidity() {
    const nextValue = Number(qrCodeValiditySeconds)
    setError("")
    if (!Number.isFinite(nextValue) || nextValue < 5) {
      setError("QR Code 有效秒數必須至少 5 秒")
      return
    }
    setIsUpdatingSettings(true)
    const response = await fetch(`/api/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qrCodeValiditySeconds: nextValue })
    })
    const payload = await response.json().catch(() => ({}))
    setIsUpdatingSettings(false)
    if (!response.ok) {
      setError(payload.error ?? "更新 QR Code 有效秒數失敗")
      return
    }
    showToast("QR Code 有效秒數已更新", "success")
    startTransition(() => router.refresh())
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

  async function reopenSession() {
    const ok = await post(`/api/sessions/${sessionId}/reopen`)
    if (!ok) return
    setStatus("active")
    setReopenOpen(false)
    showToast("點名已重新開啟", "success")
  }

  const finished = status !== "active"
  const attendancePct =
    counts.enrolledCount > 0 ? Math.round((counts.totalCount / counts.enrolledCount) * 100) : 0
  const autoCloseAt = autoExpireMinutes
    ? new Date(new Date(sessionOpenedAt).getTime() + autoExpireMinutes * 60_000)
    : null
  const remainingCloseSeconds = autoCloseAt
    ? Math.max(0, Math.ceil((autoCloseAt.getTime() - now) / 1000))
    : null
  const closeCountdownText =
    remainingCloseSeconds === null
      ? "未設定"
      : `${Math.floor(remainingCloseSeconds / 60)
          .toString()
          .padStart(2, "0")}:${(remainingCloseSeconds % 60).toString().padStart(2, "0")}`

  return (
    <section className={`panel ${finished ? "session-ended" : ""}`}>
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h2 style={{ margin: 0 }}>即時點名狀態</h2>
            <span className={`badge ${status === "active" ? "active" : status}`}>
              {status === "active" && <span className="dot" aria-hidden />}
              {status === "active"
                ? "進行中"
                : status === "closed"
                  ? "已關閉"
                  : status === "voided"
                    ? "已作廢"
                    : status}
            </span>
          </div>

          {finished && (
            <p className="text-muted" style={{ marginBottom: 8, fontSize: "0.875rem" }}>
              本次 Session 已{status === "closed" ? "關閉" : status === "voided" ? "作廢" : "結束"}
              ，QR Code 已停用。
            </p>
          )}
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            className="btn secondary"
            type="button"
            disabled={isPending || status !== "active"}
            onClick={() => setCloseOpen(true)}
          >
            關閉點名
          </button>
          {(status === "closed" || status === "expired") && (
            <button
              className="btn"
              type="button"
              disabled={isPending}
              onClick={() => setReopenOpen(true)}
            >
              重新開啟點名
            </button>
          )}
          <button
            className="btn danger"
            type="button"
            disabled={isPending || status !== "closed"}
            onClick={() => setVoidOpen(true)}
          >
            作廢 Session
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid compact" style={{ marginTop: 16 }}>
        <div className="stat-card">
          <span>已點名</span>
          <strong>
            {counts.totalCount}
            <span style={{ fontSize: "1rem", color: "var(--color-text-muted)", fontWeight: 500 }}>
              {" "}
              / {counts.enrolledCount}
            </span>
          </strong>
        </div>
        <div className="stat-card">
          <span>準時</span>
          <strong style={{ color: "var(--color-success)" }}>{counts.onTimeCount}</strong>
        </div>
        <div className="stat-card">
          <span>遲到</span>
          <strong style={{ color: "var(--color-warning)" }}>{counts.lateCount}</strong>
        </div>
        <div className="stat-card">
          <span>出席率</span>
          <strong>
            {attendancePct}
            <span style={{ fontSize: "1rem", color: "var(--color-text-muted)", fontWeight: 500 }}>
              %
            </span>
          </strong>
        </div>
        <div className="stat-card">
          <span>{finished ? "點名狀態" : "距離關閉"}</span>
          <strong
            className="tabular"
            style={{
              color:
                remainingCloseSeconds !== null && remainingCloseSeconds <= 60 && !finished
                  ? "var(--color-accent)"
                  : "var(--color-primary-900)"
            }}
          >
            {finished ? "已結束" : closeCountdownText}
          </strong>
        </div>
      </div>

      {!finished && (
        <p className="text-muted text-sm" style={{ marginTop: 10, marginBottom: 0 }}>
          {autoCloseAt
            ? `此點名將於 ${autoCloseAt.toLocaleString("zh-TW", {
                timeZone: "Asia/Taipei",
                hour12: false
              })} 自動關閉。`
            : "此點名未設定自動關閉時間，需由管理員手動關閉。"}
        </p>
      )}

      {/* Attendance progress */}
      <div
        className="mt-3 h-2 w-full rounded-full overflow-hidden"
        style={{ background: "var(--color-primary-100)" }}
        role="progressbar"
        aria-valuenow={attendancePct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`出席率 ${attendancePct}%`}
      >
        <div
          className="h-full transition-[width] duration-500 ease-out"
          style={{
            width: `${attendancePct}%`,
            background:
              attendancePct >= 80
                ? "var(--color-success)"
                : attendancePct >= 50
                  ? "var(--color-primary-600)"
                  : "var(--color-warning)"
          }}
        />
      </div>

      {/* Latest checkin */}
      {counts.latest && (
        <div
          className="mt-4 flex items-center gap-3 px-3 py-2 rounded-lg border"
          style={{
            background: "var(--color-primary-50)",
            borderColor: "var(--color-primary-200)"
          }}
        >
          <span
            className="inline-grid place-items-center w-8 h-8 rounded-full shrink-0"
            style={{ background: "var(--color-success-soft)", color: "#14532d" }}
            aria-hidden
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-sm" style={{ color: "var(--color-text)" }}>
              <strong>{counts.latest.studentName}</strong>
              <span className="text-muted" style={{ marginLeft: 6, fontSize: "0.8125rem" }}>
                {counts.latest.studentCode ?? "-"}
              </span>
            </div>
            {counts.latest.attendedAt && (
              <div className="text-muted text-xs tabular">{counts.latest.attendedAt}</div>
            )}
          </div>
          <span className={`badge ${counts.latest.status}`}>
            {counts.latest.status === "on_time"
              ? "準時"
              : counts.latest.status === "late"
                ? "遲到"
                : counts.latest.status}
          </span>
        </div>
      )}

      {/* QR validity settings */}
      <div className="mt-5 pt-4 border-t" style={{ borderColor: "var(--color-border)" }}>
        <div className="flex items-end gap-3 flex-wrap">
          <div className="field" style={{ marginBottom: 0, flex: "1 1 200px", minWidth: 0 }}>
            <label htmlFor="qr-validity-seconds">QR Code 有效秒數</label>
            <input
              id="qr-validity-seconds"
              type="number"
              min={5}
              value={qrCodeValiditySeconds}
              disabled={finished || isUpdatingSettings}
              onChange={(event) => setQrCodeValiditySeconds(event.target.value)}
            />
            <span className="hint">最少 5 秒，數字越小防作弊性越高</span>
          </div>
          <button
            className="btn secondary"
            type="button"
            disabled={finished || isUpdatingSettings}
            onClick={updateQrCodeValidity}
          >
            {isUpdatingSettings ? "更新中…" : "更新秒數"}
          </button>
        </div>
      </div>

      {error && (
        <div className="status-card error" role="alert">
          <strong>無法完成操作</strong>
          <p style={{ margin: 0 }}>{error}</p>
        </div>
      )}

      <Dialog title="關閉點名" open={closeOpen} onClose={() => setCloseOpen(false)}>
        <p>關閉後學生將無法再使用目前 QR Code 點名。確定要關閉本次點名？</p>
        <div className="toolbar dialog-actions">
          <button
            className="btn secondary"
            type="button"
            disabled={isPending}
            onClick={() => setCloseOpen(false)}
          >
            取消
          </button>
          <button className="btn" type="button" disabled={isPending} onClick={closeSession}>
            確認關閉
          </button>
        </div>
      </Dialog>

      <Dialog title="重新開啟點名" open={reopenOpen} onClose={() => setReopenOpen(false)}>
        <p>
          重新開啟後 QR Code 會重新輪換，學生可再次掃描完成點名。
          {status === "expired" &&
            " 此 Session 原本因逾時自動關閉，重新開啟後將不再自動關閉，需由管理員手動關閉。"}
        </p>
        <div className="toolbar dialog-actions">
          <button
            className="btn secondary"
            type="button"
            disabled={isPending}
            onClick={() => setReopenOpen(false)}
          >
            取消
          </button>
          <button className="btn" type="button" disabled={isPending} onClick={reopenSession}>
            確認重新開啟
          </button>
        </div>
      </Dialog>

      <Dialog title="作廢 Session" open={voidOpen} onClose={() => setVoidOpen(false)}>
        <p className="text-muted" style={{ marginTop: 0 }}>
          作廢後此次點名結果將標記為無效，請填寫原因供稽核追蹤。
        </p>
        <div className="field">
          <label htmlFor="void-reason">作廢原因</label>
          <textarea
            id="void-reason"
            value={voidReason}
            onChange={(event) => setVoidReason(event.target.value)}
            rows={4}
            placeholder="例：系統異常導致部分學生無法點名"
          />
        </div>
        <div className="toolbar dialog-actions">
          <button
            className="btn secondary"
            type="button"
            disabled={isPending}
            onClick={() => setVoidOpen(false)}
          >
            取消
          </button>
          <button
            className="btn danger"
            type="button"
            disabled={isPending || !voidReason.trim()}
            onClick={voidSession}
          >
            確認作廢
          </button>
        </div>
      </Dialog>
    </section>
  )
}
