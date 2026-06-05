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
    <section className="panel">
      <h2>新增學生</h2>
      <form ref={formRef} onSubmit={onSubmit}>
        <div className="toolbar">
          <div className="field">
            <label>學號（選填）</label>
            <input name="studentCode" />
          </div>
          <div className="field">
            <label>姓名</label>
            <input name="name" required />
          </div>
          <div className="field">
            <label>Google Email（選填）</label>
            <input name="googleEmail" type="email" />
          </div>
        </div>
        <button className="btn" type="submit" disabled={isPending || isSaving}>
          {isPending || isSaving ? "新增中" : "新增並加入課程"}
        </button>
      </form>
      {message && <p>{message}</p>}
      <p className="text-muted">可只填姓名；學生第一次掃 QR Code 時會用姓名綁定 Google Email。</p>
      {error && <p style={{ color: "#b42318" }}>{error}</p>}
    </section>
  )
}
