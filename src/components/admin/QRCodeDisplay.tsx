"use client"

import { useEffect, useState } from "react"

export function QRCodeDisplay({ sessionId, initialStatus }: { sessionId: string; initialStatus: string }) {
  const [qr, setQr] = useState<string>("")
  const [remaining, setRemaining] = useState(0)
  const [status, setStatus] = useState(initialStatus)

  useEffect(() => {
    if (status !== "active") return
    const source = new EventSource(`/api/sessions/${sessionId}/stream`)
    source.addEventListener("qrcode_update", (event) => {
      const data = JSON.parse((event as MessageEvent).data)
      setQr(data.qrcodeDataUrl)
      setRemaining(data.remainingSeconds)
    })
    source.addEventListener("session_status_changed", (event) => {
      const data = JSON.parse((event as MessageEvent).data)
      setStatus(data.newStatus)
      source.close()
    })
    return () => source.close()
  }, [sessionId, status])

  useEffect(() => {
    const interval = setInterval(() => setRemaining((value) => Math.max(0, value - 1)), 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <section className={`panel qr-panel ${status !== "active" ? "qr-disabled" : ""}`}>
      {status === "active" ? (
        <>
          {qr ? <img src={qr} alt="點名 QR Code" width={320} height={320} /> : <p>QR Code 載入中</p>}
          <p>QR Code 將於 {remaining} 秒後更新</p>
        </>
      ) : (
        <div className="empty-state">
          <h2>QR Code 已停用</h2>
          <p>Session 狀態：{status}</p>
          <p>此頁面保留作為本次點名的結束摘要，學生不能再掃描此 QR Code 送出點名。</p>
        </div>
      )}
    </section>
  )
}
