"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { getSession, signIn } from "next-auth/react"
import { parseTokenSlot } from "@/lib/token-slot"
import { attendanceStatusLabel } from "@/lib/status-label"
import { SecureSignOutButton } from "@/components/shared/SecureSignOutButton"

type CheckinInfo = {
  courseName: string
  sessionStatus: string
  officialStartTime: string | null
  attendance: {
    status: string
    attendedAt: string | null
  } | null
}

function CheckinContent() {
  const params = useSearchParams()
  const token = params.get("token") ?? ""
  const sessionId = params.get("sessionId") ?? ""
  const validitySeconds = Math.max(5, Number(params.get("validitySeconds") ?? 15) || 15)
  const gracePeriodSeconds = Math.max(0, Number(params.get("gracePeriodSeconds") ?? 60) || 60)
  const slot = useMemo(() => parseTokenSlot(token, validitySeconds), [token, validitySeconds])
  const [remaining, setRemaining] = useState(0)
  const [acceptedRemaining, setAcceptedRemaining] = useState(0)
  const [result, setResult] = useState<{
    kind: "info" | "success" | "error"
    title: string
    detail: string
  } | null>(null)
  const [currentEmail, setCurrentEmail] = useState<string | null>(null)
  const [checkinInfo, setCheckinInfo] = useState<CheckinInfo | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [autoSubmitted, setAutoSubmitted] = useState(false)
  const [requiresStudentName, setRequiresStudentName] = useState(false)
  const [studentName, setStudentName] = useState("")
  const expired = remaining <= 0
  const hasCheckinParams = Boolean(token && sessionId)
  const completedAttendance = checkinInfo?.attendance ?? null
  const courseName = checkinInfo?.courseName ?? "課程點名"

  useEffect(() => {
    const tick = () => {
      const expiresAt = slot?.expiresAt.getTime() ?? 0
      setRemaining(slot ? Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)) : 0)
      setAcceptedRemaining(
        slot
          ? Math.max(0, Math.ceil((expiresAt + gracePeriodSeconds * 1000 - Date.now()) / 1000))
          : 0
      )
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [gracePeriodSeconds, slot])

  useEffect(() => {
    if (!sessionId) return
    let cancelled = false
    void fetch(`/api/checkin/sessions/${encodeURIComponent(sessionId)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data: CheckinInfo | null) => {
        if (cancelled || !data) return
        setCheckinInfo(data)
        if (data.attendance) {
          setResult({
            kind: "success",
            title: "已完成點名",
            detail: buildCompletionDetail(data.attendance.status, data.attendance.attendedAt)
          })
        }
      })
      .catch(() => {
        // The QR token can still be submitted even if this display summary fails.
      })
    return () => {
      cancelled = true
    }
  }, [sessionId])

  async function submit() {
    if (!hasCheckinParams) {
      setResult({
        kind: "error",
        title: "QR Code 資料不完整",
        detail: "請重新掃描管理員顯示的 QR Code。"
      })
      return
    }
    if (requiresStudentName && !studentName.trim()) {
      setResult({
        kind: "error",
        title: "請輸入姓名",
        detail: "第一次簽到需要用課程名單中的姓名綁定 Google 帳號。"
      })
      return
    }
    setIsSubmitting(true)
    setResult(null)
    try {
      const response = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, sessionId, studentName: studentName.trim() || undefined })
      })
      const body = await response.json()
      if (response.status === 401) {
        setResult({
          kind: "info",
          title: "需要登入",
          detail: "請先使用 Google 帳號登入，再提交點名。"
        })
        login()
        return
      }
      setResult(
        response.ok
          ? {
              kind: "success",
              title: body.message ?? "點名成功",
              detail: buildCompletionDetail(body.status, body.attendedAt)
            }
          : { kind: "error", title: "點名失敗", detail: body.error ?? "請重新掃描 QR Code" }
      )
      setRequiresStudentName(Boolean(body.requiresStudentName))
      if (response.ok) {
        setRequiresStudentName(false)
        setCheckinInfo((current) => ({
          courseName: body.courseName ?? current?.courseName ?? "課程點名",
          sessionStatus: current?.sessionStatus ?? "active",
          officialStartTime: current?.officialStartTime ?? null,
          attendance: {
            status: body.status,
            attendedAt: body.attendedAt ?? null
          }
        }))
      }
    } catch {
      setResult({ kind: "error", title: "網路異常", detail: "請重新掃描 QR Code" })
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    if (!hasCheckinParams || autoSubmitted || completedAttendance) return
    let cancelled = false
    void getSession().then((session) => {
      if (cancelled || !session) return
      setCurrentEmail(session.user?.email ?? null)
      setAutoSubmitted(true)
      void submit()
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSubmitted, completedAttendance, hasCheckinParams, sessionId, token])

  function login() {
    void signIn("google", { callbackUrl: window.location.href })
  }

  const totalForProgress = validitySeconds + gracePeriodSeconds
  const totalRemaining = expired ? acceptedRemaining : remaining + gracePeriodSeconds
  const progress = Math.max(0, Math.min(100, (totalRemaining / totalForProgress) * 100))
  const inGracePeriod = expired && acceptedRemaining > 0

  return (
    <main className="min-h-dvh grid place-items-start sm:place-items-center px-4 py-6 bg-linear-to-b from-primary-50 via-paper to-paper">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-5">
          <span className="inline-grid place-items-center w-9 h-9 rounded-xl bg-linear-to-br from-primary-600 to-primary-300 text-white shadow-card">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
          </span>
          <span className="font-semibold text-primary-900">課程點名</span>
        </div>

        <section className="panel" style={{ marginTop: 0, padding: "22px 22px 24px" }}>
          <div className="mb-5 text-center">
            <p className="text-muted" style={{ margin: 0, fontSize: "0.8125rem" }}>
              課程
            </p>
            <h1 style={{ margin: "2px 0 0", fontSize: "1.35rem" }}>{courseName}</h1>
            {checkinInfo?.officialStartTime && (
              <p className="text-muted" style={{ margin: "4px 0 0", fontSize: "0.875rem" }}>
                點名時間：{formatDateTime(checkinInfo.officialStartTime)}
              </p>
            )}
          </div>

          {/* Status header */}
          {!hasCheckinParams ? (
            <StatusHeader
              icon="warn"
              title="QR Code 資料不完整"
              subtitle="請重新掃描管理員顯示的 QR Code"
            />
          ) : result?.kind === "success" ? (
            <StatusHeader icon="success" title={result.title} subtitle={result.detail} />
          ) : expired && acceptedRemaining <= 0 ? (
            <StatusHeader
              icon="warn"
              title="QR Code 可能已過期"
              subtitle="仍可嘗試登入，由系統確認是否可點名"
            />
          ) : inGracePeriod ? (
            <StatusHeader
              icon="info"
              title="QR Code 已更新"
              subtitle={`仍可在 ${acceptedRemaining} 秒內完成登入點名`}
            />
          ) : (
            <StatusHeader
              icon="qr"
              title={
                <span>
                  <span className="tabular">{remaining}</span> 秒後 QR Code 更新
                </span>
              }
              subtitle="若已掃到，請按下方按鈕提交點名"
            />
          )}

          {/* Progress bar */}
          {hasCheckinParams && result?.kind !== "success" && (
            <div
              className="mt-4 h-2 w-full rounded-full bg-primary-100 overflow-hidden"
              aria-hidden
            >
              <div
                className={`h-full rounded-full transition-[width] duration-1000 ease-linear ${
                  inGracePeriod ? "bg-accent" : "bg-primary-600"
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {/* Actions */}
          {currentEmail && (
            <div className="mt-4 rounded-md bg-primary-50 px-3 py-2 text-sm text-primary-900 grid gap-2">
              <p style={{ margin: 0 }}>
                目前登入 Google 帳號：<strong>{currentEmail}</strong>
              </p>
              <SecureSignOutButton
                label="登出並更換 Google 帳號"
                returnTo={`/checkin?sessionId=${encodeURIComponent(sessionId)}&token=${encodeURIComponent(token)}&validitySeconds=${validitySeconds}&gracePeriodSeconds=${gracePeriodSeconds}`}
                style={{ minHeight: 36, width: "100%" }}
              />
            </div>
          )}
          {requiresStudentName && result?.kind !== "success" && (
            <div className="field mt-4">
              <label>姓名</label>
              <input
                value={studentName}
                onChange={(event) => setStudentName(event.target.value)}
                placeholder="請輸入課程名單上的姓名"
                autoComplete="name"
              />
              <p className="text-muted" style={{ margin: "6px 0 0", fontSize: "0.8125rem" }}>
                系統只會在本課程中找到唯一且尚未綁定 Email 的同名學生時完成綁定。
              </p>
            </div>
          )}
          <div className="mt-5 grid gap-2">
            {result?.kind !== "success" && (
              <>
                <button
                  className="btn accent"
                  type="button"
                  disabled={!hasCheckinParams || isSubmitting}
                  onClick={submit}
                  style={{ minHeight: 48, fontSize: "1rem", width: "100%" }}
                >
                  {isSubmitting ? (
                    <>
                      <Spinner /> 提交中…
                    </>
                  ) : (
                    "提交點名"
                  )}
                </button>
                <button
                  className="btn secondary"
                  type="button"
                  disabled={!hasCheckinParams}
                  onClick={login}
                  style={{ minHeight: 44, width: "100%" }}
                >
                  使用 Google 登入
                </button>
              </>
            )}
            {result?.kind === "success" && (
              <p
                className="text-muted"
                style={{ margin: 0, textAlign: "center", fontSize: "0.875rem" }}
              >
                你可以關閉此分頁。
              </p>
            )}
          </div>

          {/* Result card (non-success cases shown here as a sub-card; success already in header) */}
          {result && result.kind !== "success" && (
            <div className={`status-card ${result.kind}`}>
              <strong>{result.title}</strong>
              <p style={{ margin: 0 }}>{result.detail}</p>
            </div>
          )}
        </section>

        <p
          className="text-muted"
          style={{ marginTop: 16, fontSize: "0.8125rem", textAlign: "center" }}
        >
          系統將自動記錄你的點名時間
        </p>
      </div>
    </main>
  )
}

function StatusHeader({
  icon,
  title,
  subtitle
}: {
  icon: "success" | "warn" | "info" | "qr"
  title: React.ReactNode
  subtitle: React.ReactNode
}) {
  const cfg = {
    success: { bg: "bg-success/10", color: "text-[#14532d]", iconColor: "#16A34A" },
    warn: { bg: "bg-warning/15", color: "text-[#78350f]", iconColor: "#F59E0B" },
    info: { bg: "bg-info/10", color: "text-[#1e3a8a]", iconColor: "#2563EB" },
    qr: { bg: "bg-primary-100", color: "text-primary-900", iconColor: "#0D9488" }
  }[icon]

  return (
    <div className="flex items-start gap-3">
      <span
        className={`inline-grid place-items-center w-11 h-11 rounded-full ${cfg.bg} shrink-0`}
        aria-hidden
      >
        {icon === "success" && (
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke={cfg.iconColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
        )}
        {icon === "warn" && (
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke={cfg.iconColor}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
          </svg>
        )}
        {icon === "info" && (
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke={cfg.iconColor}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
        )}
        {icon === "qr" && (
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke={cfg.iconColor}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
            <path d="M14 14h3v3" />
            <path d="M21 21h-3v-3" />
            <path d="M14 21h.01" />
          </svg>
        )}
      </span>
      <div className="min-w-0">
        <h2 className={`m-0 ${cfg.color}`} style={{ fontSize: "1.125rem" }}>
          {title}
        </h2>
        <p className="text-muted" style={{ margin: "4px 0 0", fontSize: "0.9375rem" }}>
          {subtitle}
        </p>
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="spin" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path
        d="M22 12a10 10 0 0 0-10-10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  )
}

function buildCompletionDetail(status: string | null | undefined, attendedAt: string | null | undefined) {
  const parts = [`狀態：${attendanceStatusLabel(status)}`]
  if (attendedAt) parts.push(`簽到時間：${formatDateTime(attendedAt)}`)
  return parts.join(" · ")
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(new Date(value))
}

export default function CheckinPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-dvh grid place-items-center">
          <p className="text-muted">載入中…</p>
        </main>
      }
    >
      <CheckinContent />
    </Suspense>
  )
}
