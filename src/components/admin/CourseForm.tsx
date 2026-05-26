"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

interface CourseFormValue {
  id?: string
  name?: string
  dayOfWeek?: number
  startTime?: string
  endTime?: string
  lateThresholdMinutes?: number
}

export function CourseForm({ course }: { course?: CourseFormValue }) {
  const router = useRouter()
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [isPending, startTransition] = useTransition()

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setMessage("")

    const form = event.currentTarget
    const formData = new FormData(form)
    const payload = {
      name: String(formData.get("name") ?? "").trim(),
      dayOfWeek: Number(formData.get("dayOfWeek")),
      startTime: String(formData.get("startTime") ?? ""),
      endTime: String(formData.get("endTime") ?? ""),
      lateThresholdMinutes: Number(formData.get("lateThresholdMinutes") ?? 0)
    }

    const response = await fetch(course?.id ? `/api/courses/${course.id}` : "/api/courses", {
      method: course?.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
    const body = await response.json().catch(() => ({}))

    if (!response.ok) {
      setError(body.error ?? "課程儲存失敗")
      return
    }

    if (body.lateThresholdChanged) {
      setMessage("此修改僅對後續點名生效，已記錄點名狀態不受影響")
    } else {
      setMessage(course?.id ? "課程已更新" : "課程已新增")
    }

    if (!course?.id) form.reset()
    startTransition(() => router.refresh())
  }

  return (
    <form className="panel" onSubmit={onSubmit}>
      <div className="field">
        <label>課程名稱</label>
        <input name="name" defaultValue={course?.name ?? ""} required />
      </div>
      <div className="field">
        <label>星期</label>
        <select name="dayOfWeek" defaultValue={course?.dayOfWeek ?? 1}>
          {["日", "一", "二", "三", "四", "五", "六"].map((label, index) => (
            <option key={index} value={index}>
              週{label}
            </option>
          ))}
        </select>
      </div>
      <div className="toolbar">
        <div className="field">
          <label>開始</label>
          <input name="startTime" type="time" defaultValue={course?.startTime ?? "09:00"} />
        </div>
        <div className="field">
          <label>結束</label>
          <input name="endTime" type="time" defaultValue={course?.endTime ?? "12:00"} />
        </div>
        <div className="field">
          <label>遲到分鐘</label>
          <input
            name="lateThresholdMinutes"
            type="number"
            min={0}
            defaultValue={course?.lateThresholdMinutes ?? 0}
          />
        </div>
      </div>
      <button className="btn" type="submit" disabled={isPending}>
        {isPending ? "儲存中" : "儲存"}
      </button>
      {message && <p>{message}</p>}
      {error && <p style={{ color: "#b42318" }}>{error}</p>}
    </form>
  )
}
