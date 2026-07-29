"use client"

import { useRouter } from "next/navigation"
import { useRef, useState, useTransition } from "react"

export function StudentManager({ courseId }: { courseId: string }) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [isPending, startTransition] = useTransition()
  const [isSaving, setIsSaving] = useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setMessage("")

    const formData = new FormData(event.currentTarget)
    const payload = {
      studentCode: String(formData.get("studentCode") ?? "").trim(),
      name: String(formData.get("name") ?? "").trim(),
      googleEmail: String(formData.get("googleEmail") ?? "").trim()
    }

    setIsSaving(true)
    const response = await fetch(`/api/courses/${courseId}/students`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
    const body = await response.json().catch(() => ({}))
    setIsSaving(false)
    if (!response.ok) {
      setError(body.error ?? "新增學生失敗")
      return
    }

    formRef.current?.reset()
    setMessage(body.message ?? "學生已新增並加入課程")
    startTransition(() => router.refresh())
  }

  return (
    <section className="panel roster-tool-card">
      <div className="panel-header">
        <div>
          <p className="section-kicker">單筆新增</p>
          <h2>新增學生</h2>
          <p>名單中還沒有這位學生時使用。</p>
        </div>
      </div>
      <form ref={formRef} onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="new-student-code">學號（選填）</label>
          <input id="new-student-code" name="studentCode" placeholder="例如：S113001" />
        </div>
        <div className="field">
          <label htmlFor="new-student-name">姓名</label>
          <input id="new-student-name" name="name" placeholder="課程名單上的姓名" required />
        </div>
        <div className="field">
          <label htmlFor="new-student-email">Google Email（選填）</label>
          <input
            id="new-student-email"
            name="googleEmail"
            type="email"
            placeholder="未綁定可先留空"
          />
        </div>
        <button className="btn roster-tool-action" type="submit" disabled={isPending || isSaving}>
          {isPending || isSaving ? "新增中…" : "新增並加入課程"}
        </button>
      </form>
      <p className="tool-hint">
        尚未填寫 Google Email 的學生無法簽到；請由管理員先完成帳號綁定，避免身分被冒用。
      </p>
      {message && (
        <p className="inline-feedback success" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="inline-feedback error" role="alert">
          {error}
        </p>
      )}
    </section>
  )
}
