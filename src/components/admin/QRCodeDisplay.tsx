"use client"

import { useEffect, useState } from "react"

export function QRCodeDisplay({ sessionId }: { sessionId: string }) {
  const [qr, setQr] = useState<string>("")
  const [remaining, setRemaining] = useState(0)
  const [status, setStatus] = useState("active")

  useEffect(() => {
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
  }, [sessionId])

  useEffect(() => {
    const interval = setInterval(() => setRemaining((value) => Math.max(0, value - 1)), 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <section className="panel">
      {qr ? <img src={qr} alt="點名 QR Code" width={320} height={320} /> : <p>QR Code 載入中</p>}
      <p>QR Code 將於 {remaining} 秒後更新</p>
      {status !== "active" && <p>Session 狀態：{status}</p>}
    </section>
  )
}
