"use client"

import { useRouter } from "next/navigation"
import { useMemo, useState, useTransition } from "react"

function todayDateTime(time: string) {
  const now = new Date()
  const [hour = "09", minute = "00"] = time.split(":")
  now.setHours(Number(hour), Number(minute), 0, 0)
  const offset = now.getTimezoneOffset()
  const local = new Date(now.getTime() - offset * 60_000)
  return local.toISOString().slice(0, 16)
}

export function OpenSessionForm({
  courseId,
  defaultStartTime,
  activeSessionId
}: {
  courseId: string
  defaultStartTime: string
  activeSessionId?: string
}) {
  const router = useRouter()
  const [error, setError] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [isPending, startTransition] = useTransition()
  const defaultOfficialStartTime = useMemo(
    () => todayDateTime(defaultStartTime),
    [defaultStartTime]
  )

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    const formData = new FormData(event.currentTarget)
    const officialStart = String(formData.get("officialStartTime") ?? "")
    const officialStartDate = new Date(officialStart)
    if (!officialStart || Number.isNaN(officialStartDate.getTime())) {
      setError("請輸入有效的官方開始時間")
      return
    }
    const autoExpireMinutes = Number(formData.get("autoExpireMinutes") || 90)
    const qrCodeValiditySeconds = Number(formData.get("qrCodeValiditySeconds") || 15)
    const gracePeriodSeconds = Number(formData.get("gracePeriodSeconds") || 60)
    if (!Number.isFinite(autoExpireMinutes) || autoExpireMinutes <= 0) {
      setError("自動逾時分鐘必須大於 0")
      return
    }
    if (!Number.isFinite(qrCodeValiditySeconds) || qrCodeValiditySeconds < 5) {
      setError("QR Code 有效秒數必須至少 5 秒")
      return
    }
    if (!Number.isFinite(gracePeriodSeconds) || gracePeriodSeconds <= 0) {
      setError("QR 寬限秒數必須大於 0")
      return
    }
    const payload = {
      officialStartTime: officialStartDate.toISOString(),
      autoExpireMinutes,
      qrCodeValiditySeconds,
      gracePeriodSeconds
    }
    setIsSaving(true)
    const response = await fetch(`/api/courses/${courseId}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
    const body = await response.json().catch(() => ({}))
    setIsSaving(false)
    if (!response.ok) {
      setError(body.error ?? "開啟點名失敗")
      return
    }
    startTransition(() => router.push(`/sessions/${body.id}`))
  }

  return (
    <section className="panel session-launcher">
      <div className="panel-header">
        <div>
          <h2>{activeSessionId ? "點名正在進行" : "設定點名時間"}</h2>
          <p>
            {activeSessionId
              ? "學生目前仍可掃描 QR Code，請回到點名頁查看即時人數。"
              : "遲到時間會以「官方開始時間」為基準，不受建立 QR Code 的時間影響。"}
          </p>
        </div>
        {activeSessionId && (
          <span className="badge active">
            <span className="dot" aria-hidden />
            進行中
          </span>
        )}
      </div>

      {activeSessionId ? (
        <div className="live-session-callout">
          <span className="live-session-icon" aria-hidden>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <path d="M14 14h3v3M21 21h-3v-3M14 21h.01" />
            </svg>
          </span>
          <div>
            <strong>此課程已有進行中的點名</strong>
            <p>同一門課同時間只能有一個點名 Session。</p>
          </div>
          <button
            className="btn accent"
            type="button"
            onClick={() => router.push(`/sessions/${activeSessionId}`)}
          >
            回到即時點名
          </button>
        </div>
      ) : (
        <form onSubmit={onSubmit}>
          <div className="field session-time-field">
            <label htmlFor="official-start-time">官方開始時間</label>
            <input
              id="official-start-time"
              name="officialStartTime"
              type="datetime-local"
              defaultValue={defaultOfficialStartTime}
              required
            />
            <span className="hint">請確認日期與時間正確；建立後仍可關閉或作廢本次點名。</span>
          </div>

          <details className="advanced-settings">
            <summary>
              進階設定
              <span>一般情況可使用預設值</span>
            </summary>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="auto-expire-minutes">自動關閉</label>
                <div className="input-suffix">
                  <input
                    id="auto-expire-minutes"
                    name="autoExpireMinutes"
                    type="number"
                    min={1}
                    defaultValue={90}
                    required
                  />
                  <span>分鐘</span>
                </div>
              </div>
              <div className="field">
                <label htmlFor="qr-validity-seconds">QR Code 輪換</label>
                <div className="input-suffix">
                  <input
                    id="qr-validity-seconds"
                    name="qrCodeValiditySeconds"
                    type="number"
                    min={5}
                    defaultValue={15}
                    required
                  />
                  <span>秒</span>
                </div>
              </div>
              <div className="field">
                <label htmlFor="grace-period-seconds">登入寬限</label>
                <div className="input-suffix">
                  <input
                    id="grace-period-seconds"
                    name="gracePeriodSeconds"
                    type="number"
                    min={1}
                    defaultValue={60}
                    required
                  />
                  <span>秒</span>
                </div>
              </div>
            </div>
          </details>

          <button
            className="btn accent launch-button"
            type="submit"
            disabled={isPending || isSaving}
          >
            {isPending || isSaving ? "正在建立 QR Code…" : "建立並顯示 QR Code"}
          </button>
        </form>
      )}

      {error && (
        <div className="status-card error" role="alert">
          <strong>無法開啟點名</strong>
          <p style={{ margin: 0 }}>{error}</p>
        </div>
      )}
    </section>
  )
}
