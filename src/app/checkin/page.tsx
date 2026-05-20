"use client"

import { Suspense } from "react"
import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { getSession, signIn } from "next-auth/react"
import { parseTokenSlot } from "@/lib/token-slot"

function CheckinContent() {
  const params = useSearchParams()
  const token = params.get("token") ?? ""
  const sessionId = params.get("sessionId") ?? ""
  const validitySeconds = Math.max(5, Number(params.get("validitySeconds") ?? 15) || 15)
  const gracePeriodSeconds = Math.max(0, Number(params.get("gracePeriodSeconds") ?? 60) || 60)
  const slot = useMemo(() => parseTokenSlot(token, validitySeconds), [token, validitySeconds])
  const [remaining, setRemaining] = useState(0)
  const [acceptedRemaining, setAcceptedRemaining] = useState(0)
  const [result, setResult] = useState<{ kind: "info" | "success" | "error"; title: string; detail: string } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [autoSubmitted, setAutoSubmitted] = useState(false)
  const expired = remaining <= 0
  const hasCheckinParams = Boolean(token && sessionId)

  useEffect(() => {
    const tick = () => {
      const expiresAt = slot?.expiresAt.getTime() ?? 0
      setRemaining(slot ? Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)) : 0)
      setAcceptedRemaining(
        slot ? Math.max(0, Math.ceil((expiresAt + gracePeriodSeconds * 1000 - Date.now()) / 1000)) : 0
      )
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [gracePeriodSeconds, slot])

  async function submit() {
    if (!hasCheckinParams) {
      setResult({ kind: "error", title: "QR Code 資料不完整", detail: "請重新掃描管理員顯示的 QR Code。" })
      return
    }
    setIsSubmitting(true)
    setResult(null)
    try {
      const response = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, sessionId })
      })
      const body = await response.json()
      if (response.status === 401) {
        setResult({ kind: "info", title: "需要登入", detail: "請先使用 Google 帳號登入，再提交點名。" })
        login()
        return
      }
      setResult(
        response.ok
          ? { kind: "success", title: body.message ?? "點名成功", detail: `狀態：${body.status}` }
          : { kind: "error", title: "點名失敗", detail: body.error ?? "請重新掃描 QR Code" }
      )
    } catch {
      setResult({ kind: "error", title: "網路異常", detail: "請重新掃描 QR Code" })
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    if (!hasCheckinParams || autoSubmitted) return
    let cancelled = false
    void getSession().then((session) => {
      if (cancelled || !session) return
      setAutoSubmitted(true)
      void submit()
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSubmitted, hasCheckinParams, sessionId, token])

  function login() {
    void signIn("google", { callbackUrl: window.location.href })
  }

  return (
    <main className="shell" style={{ maxWidth: 560 }}>
      <h1>課程點名</h1>
      <section className="panel">
        {!hasCheckinParams ? (
          <p>QR Code 資料不完整，請重新掃描管理員顯示的 QR Code</p>
        ) : expired && acceptedRemaining <= 0 ? (
          <p>QR Code 可能已超過建議完成時間，仍可嘗試登入並由系統確認是否可點名</p>
        ) : expired ? (
          <p>QR Code 已更新，仍可在 {acceptedRemaining} 秒內完成登入點名</p>
        ) : (
          <p>QR Code 將於 {remaining} 秒後更新</p>
        )}
        <div className="toolbar">
          <button className="btn secondary" type="button" disabled={!hasCheckinParams} onClick={login}>
            使用 Google 登入
          </button>
          <button className="btn" type="button" disabled={!hasCheckinParams || isSubmitting} onClick={submit}>
            {isSubmitting ? "提交中" : "提交點名"}
          </button>
        </div>
        {result && (
          <div className={`status-card ${result.kind}`}>
            <strong>{result.title}</strong>
            <p>{result.detail}</p>
          </div>
        )}
      </section>
    </main>
  )
}

export default function CheckinPage() {
  return (
    <Suspense fallback={<main className="shell">載入中</main>}>
      <CheckinContent />
    </Suspense>
  )
}
