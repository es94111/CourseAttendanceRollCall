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
  const slot = useMemo(() => parseTokenSlot(token), [token])
  const [remaining, setRemaining] = useState(0)
  const [result, setResult] = useState<{ kind: "info" | "success" | "error"; title: string; detail: string } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [autoSubmitted, setAutoSubmitted] = useState(false)
  const expired = remaining <= 0

  useEffect(() => {
    const tick = () => setRemaining(slot ? Math.max(0, Math.ceil((slot.expiresAt.getTime() - Date.now()) / 1000)) : 0)
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [slot])

  async function submit() {
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
    if (expired || autoSubmitted || !token || !sessionId) return
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
  }, [autoSubmitted, expired, sessionId, token])

  function login() {
    void signIn("google", { callbackUrl: window.location.href })
  }

  return (
    <main className="shell" style={{ maxWidth: 560 }}>
      <h1>課程點名</h1>
      <section className="panel">
        {expired ? <p>QR Code 已失效，請等待管理員顯示新 QR Code 後重新掃描</p> : <p>QR Code 將於 {remaining} 秒後更新</p>}
        <div className="toolbar">
          <button className="btn secondary" type="button" disabled={expired} onClick={login}>
            使用 Google 登入
          </button>
          <button className="btn" type="button" disabled={expired || isSubmitting} onClick={submit}>
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
