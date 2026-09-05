"use client"

import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState, useTransition } from "react"

function todayDateTime(time: string) {
  const now = new Date()
  const [hour = "09", minute = "00"] = time.split(":")
  now.setHours(Number(hour), Number(minute), 0, 0)
  const offset = now.getTimezoneOffset()
  const local = new Date(now.getTime() - offset * 60_000)
  return local.toISOString().slice(0, 16)
}

const DEFAULT_ADVANCED_SETTINGS = {
  autoExpireMinutes: 90,
  qrCodeValiditySeconds: 15,
  gracePeriodSeconds: 60
}

type AdvancedSettings = typeof DEFAULT_ADVANCED_SETTINGS

function advancedSettingsStorageKey(courseId: string) {
  return `rollcall:advancedSettings:${courseId}`
}

function loadSavedAdvancedSettings(courseId: string): AdvancedSettings | null {
  try {
    const raw = window.localStorage.getItem(advancedSettingsStorageKey(courseId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<Record<keyof AdvancedSettings, unknown>>
    const autoExpireMinutes = Number(parsed.autoExpireMinutes)
    const qrCodeValiditySeconds = Number(parsed.qrCodeValiditySeconds)
    const gracePeriodSeconds = Number(parsed.gracePeriodSeconds)
    if (
      !Number.isFinite(autoExpireMinutes) ||
      !Number.isFinite(qrCodeValiditySeconds) ||
      !Number.isFinite(gracePeriodSeconds)
    ) {
      return null
    }
    return { autoExpireMinutes, qrCodeValiditySeconds, gracePeriodSeconds }
  } catch {
    return null
  }
}

function saveAdvancedSettings(courseId: string, settings: AdvancedSettings) {
  try {
    window.localStorage.setItem(advancedSettingsStorageKey(courseId), JSON.stringify(settings))
  } catch {
    // localStorage 不可用（例如無痕模式）時安靜略過，不影響點名建立
  }
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
  const [advancedSettings, setAdvancedSettings] =
    useState<AdvancedSettings>(DEFAULT_ADVANCED_SETTINGS)
  const [restoredFromSaved, setRestoredFromSaved] = useState(false)
  const defaultOfficialStartTime = useMemo(
    () => todayDateTime(defaultStartTime),
    [defaultStartTime]
  )

  useEffect(() => {
    const saved = loadSavedAdvancedSettings(courseId)
    if (saved) {
      setAdvancedSettings(saved)
      setRestoredFromSaved(true)
    }
  }, [courseId])

  function updateAdvancedSetting(key: keyof AdvancedSettings, rawValue: string) {
    setAdvancedSettings((prev) => ({ ...prev, [key]: Number(rawValue) }))
  }

  function resetAdvancedSettings() {
    setAdvancedSettings(DEFAULT_ADVANCED_SETTINGS)
    setRestoredFromSaved(false)
  }

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
    saveAdvancedSettings(courseId, { autoExpireMinutes, qrCodeValiditySeconds, gracePeriodSeconds })
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
              <span>{restoredFromSaved ? "已套用上次使用的設定" : "一般情況可使用預設值"}</span>
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
                    value={advancedSettings.autoExpireMinutes}
                    onChange={(event) =>
                      updateAdvancedSetting("autoExpireMinutes", event.target.value)
                    }
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
                    value={advancedSettings.qrCodeValiditySeconds}
                    onChange={(event) =>
                      updateAdvancedSetting("qrCodeValiditySeconds", event.target.value)
                    }
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
                    value={advancedSettings.gracePeriodSeconds}
                    onChange={(event) =>
                      updateAdvancedSetting("gracePeriodSeconds", event.target.value)
                    }
                    required
                  />
                  <span>秒</span>
                </div>
              </div>
            </div>
            <div className="advanced-settings-footer">
              <span>送出後會自動記住這些數值，供下次點名使用。</span>
              <button type="button" className="reset-defaults-btn" onClick={resetAdvancedSettings}>
                恢復預設值
              </button>
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
