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
  defaultStartTime
}: {
  courseId: string
  defaultStartTime: string
}) {
  const router = useRouter()
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()
  const defaultOfficialStartTime = useMemo(() => todayDateTime(defaultStartTime), [defaultStartTime])

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    const formData = new FormData(event.currentTarget)
    const officialStart = String(formData.get("officialStartTime") ?? "")
    const payload = {
      officialStartTime: new Date(officialStart).toISOString(),
      autoExpireMinutes: Number(formData.get("autoExpireMinutes") ?? 90),
      gracePeriodSeconds: Number(formData.get("gracePeriodSeconds") ?? 60)
    }
    const response = await fetch(`/api/courses/${courseId}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) {
      setError(body.error ?? "開啟點名失敗")
      return
    }
    startTransition(() => router.push(`/sessions/${body.id}`))
  }

  return (
    <section className="panel">
      <h2>開啟點名</h2>
      <form onSubmit={onSubmit}>
        <div className="toolbar">
          <div className="field">
            <label>官方開始時間</label>
            <input
              name="officialStartTime"
              type="datetime-local"
              defaultValue={defaultOfficialStartTime}
              required
            />
          </div>
          <div className="field">
            <label>自動逾時分鐘</label>
            <input name="autoExpireMinutes" type="number" min={1} defaultValue={90} required />
          </div>
          <div className="field">
            <label>QR 寬限秒數</label>
            <input name="gracePeriodSeconds" type="number" min={1} defaultValue={60} required />
          </div>
        </div>
        <button className="btn" type="submit" disabled={isPending}>
          {isPending ? "開啟中" : "開啟點名"}
        </button>
      </form>
      {error && <p style={{ color: "#b42318" }}>{error}</p>}
    </section>
  )
}
