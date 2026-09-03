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
  const [isOpen, setIsOpen] = useState(Boolean(course?.id))
  const [isPending, startTransition] = useTransition()
  const isEditing = Boolean(course?.id)

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

    if (payload.endTime <= payload.startTime) {
      setError("結束時間必須晚於開始時間")
      return
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

    if (!course?.id) {
      form.reset()
      setIsOpen(false)
    }
    startTransition(() => router.refresh())
  }

  return (
    <section className={isEditing ? "panel settings-panel" : "create-course-card"}>
      <div className="section-heading">
        <div className="section-heading-icon" aria-hidden>
          {isEditing ? <EditIcon /> : <PlusIcon />}
        </div>
        <div>
          <h2>{isEditing ? "課程設定" : "建立新課程"}</h2>
          <p>
            {isEditing
              ? "調整上課時間與遲到判定；修改只會套用到後續點名。"
              : "先建立課程，再加入學生並開啟第一次點名。"}
          </p>
        </div>
        {!isEditing && (
          <button
            className={`btn ${isOpen ? "secondary" : ""}`}
            type="button"
            aria-expanded={isOpen}
            onClick={() => {
              setError("")
              setMessage("")
              setIsOpen((value) => !value)
            }}
          >
            {isOpen ? "暫時收合" : "新增課程"}
          </button>
        )}
      </div>

      {(isEditing || isOpen) && (
        <form className="course-form" onSubmit={onSubmit}>
          <div className="form-grid">
            <div className="field form-span-2">
              <label htmlFor={`course-name-${course?.id ?? "new"}`}>課程名稱</label>
              <input
                id={`course-name-${course?.id ?? "new"}`}
                name="name"
                defaultValue={course?.name ?? ""}
                placeholder="例如：網頁程式設計"
                required
              />
              <span className="hint">使用學生熟悉的正式課名，掃描點名時也會顯示。</span>
            </div>
            <div className="field">
              <label htmlFor={`course-day-${course?.id ?? "new"}`}>上課日</label>
              <select
                id={`course-day-${course?.id ?? "new"}`}
                name="dayOfWeek"
                defaultValue={course?.dayOfWeek ?? 1}
              >
                {["日", "一", "二", "三", "四", "五", "六"].map((label, index) => (
                  <option key={label} value={index}>
                    星期{label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor={`course-start-${course?.id ?? "new"}`}>開始時間</label>
              <input
                id={`course-start-${course?.id ?? "new"}`}
                name="startTime"
                type="time"
                defaultValue={course?.startTime ?? "09:00"}
                required
              />
            </div>
            <div className="field">
              <label htmlFor={`course-end-${course?.id ?? "new"}`}>結束時間</label>
              <input
                id={`course-end-${course?.id ?? "new"}`}
                name="endTime"
                type="time"
                defaultValue={course?.endTime ?? "12:00"}
                required
              />
            </div>
            <div className="field">
              <label htmlFor={`course-late-${course?.id ?? "new"}`}>遲到判定</label>
              <div className="input-suffix">
                <input
                  id={`course-late-${course?.id ?? "new"}`}
                  name="lateThresholdMinutes"
                  type="number"
                  min={0}
                  max={180}
                  defaultValue={course?.lateThresholdMinutes ?? 0}
                />
                <span>分鐘</span>
              </div>
            </div>
          </div>

          <div className="form-actions">
            {!isEditing && (
              <button className="btn secondary" type="button" onClick={() => setIsOpen(false)}>
                取消
              </button>
            )}
            <button className="btn" type="submit" disabled={isPending}>
              {isPending ? "儲存中…" : isEditing ? "儲存課程設定" : "建立課程"}
            </button>
          </div>
        </form>
      )}

      {message && (
        <div className="status-card success" role="status">
          <strong>已完成</strong>
          <p style={{ margin: 0 }}>{message}</p>
        </div>
      )}
      {error && (
        <div className="status-card error" role="alert">
          <strong>無法儲存課程</strong>
          <p style={{ margin: 0 }}>{error}</p>
        </div>
      )}
    </section>
  )
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  )
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z" />
    </svg>
  )
}
