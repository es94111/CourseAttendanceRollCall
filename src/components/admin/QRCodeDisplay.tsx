"use client"

import { useEffect, useState } from "react"

export function QRCodeDisplay({
  sessionId,
  initialStatus
}: {
  sessionId: string
  initialStatus: string
}) {
  const [qr, setQr] = useState<string>("")
  const [remaining, setRemaining] = useState(0)
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState(initialStatus)
  const [prevInitialStatus, setPrevInitialStatus] = useState(initialStatus)
  if (prevInitialStatus !== initialStatus) {
    setPrevInitialStatus(initialStatus)
    setStatus(initialStatus)
  }

  useEffect(() => {
    if (status !== "active") return
    let cancelled = false
    void fetch(`/api/sessions/${sessionId}/qrcode`)
      .then((response) => response.json())
      .then((data) => {
        if (cancelled || !data.qrcodeDataUrl) return
        setQr(data.qrcodeDataUrl)
        setRemaining(data.remainingSeconds)
        setTotal(data.validitySeconds ?? data.remainingSeconds)
      })
      .catch(() => {
        // SSE below will keep trying to provide the QR code.
      })
    const source = new EventSource(`/api/sessions/${sessionId}/stream`)
    source.addEventListener("qrcode_update", (event) => {
      const data = JSON.parse((event as MessageEvent).data)
      setQr(data.qrcodeDataUrl)
      setRemaining(data.remainingSeconds)
      setTotal(data.validitySeconds ?? data.remainingSeconds)
    })
    source.addEventListener("session_status_changed", (event) => {
      const data = JSON.parse((event as MessageEvent).data)
      setStatus(data.newStatus)
      source.close()
    })
    return () => {
      cancelled = true
      source.close()
    }
  }, [sessionId, status])

  useEffect(() => {
    const interval = setInterval(() => setRemaining((value) => Math.max(0, value - 1)), 1000)
    return () => clearInterval(interval)
  }, [])

  const progress = total > 0 ? Math.max(0, Math.min(100, (remaining / total) * 100)) : 0
  const isLowTime = remaining > 0 && remaining <= 5

  return (
    <section className={`panel qr-panel ${status !== "active" ? "qr-disabled session-ended" : ""}`}>
      {status === "active" ? (
        <>
          {qr ? (
            <img src={qr} alt="點名 QR Code" width={320} height={320} />
          ) : (
            <div
              className="grid place-items-center"
              style={{
                width: "min(320px, 100%)",
                aspectRatio: "1",
                background: "var(--color-bg-muted)",
                borderRadius: "var(--radius-md)"
              }}
            >
              <p className="text-muted">QR Code 載入中…</p>
            </div>
          )}

          <div className="w-full max-w-[360px]">
            <div
              className="flex items-center justify-between mb-2 text-sm"
              style={{ color: "var(--color-text-muted)" }}
            >
              <span>QR Code 將於</span>
              <span
                className="tabular font-semibold"
                style={{
                  color: isLowTime ? "var(--color-accent)" : "var(--color-primary-900)",
                  fontSize: "1rem"
                }}
              >
                {remaining} 秒
              </span>
              <span>後更新</span>
            </div>
            <div
              className="h-2 w-full rounded-full overflow-hidden"
              style={{ background: "var(--color-primary-100)" }}
              aria-hidden
            >
              <div
                className="h-full rounded-full transition-[width] duration-1000 ease-linear"
                style={{
                  width: `${progress}%`,
                  background: isLowTime ? "var(--color-accent)" : "var(--color-primary-600)"
                }}
              />
            </div>
          </div>
        </>
      ) : (
        <div className="empty-state" style={{ width: "100%" }}>
          <div
            className="inline-grid place-items-center mb-3"
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "var(--color-bg-muted)",
              color: "var(--color-text-muted)"
            }}
            aria-hidden
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <line x1="14" y1="14" x2="21" y2="21" />
            </svg>
          </div>
          <h2>QR Code 已停用</h2>
          <p className="text-muted">
            Session 狀態：<span className={`badge ${status}`}>{status}</span>
          </p>
          <p className="text-muted">
            此頁面保留作為本次點名的結束摘要，學生不能再掃描此 QR Code 送出點名。
          </p>
        </div>
      )}
    </section>
  )
}
