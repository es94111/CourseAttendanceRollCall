"use client"

import { useRouter } from "next/navigation"
import { useRef, useState, useTransition } from "react"

export function StudentManager({ courseId }: { courseId: string }) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [isPending, startTransition] = useTransition()

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

    const createResponse = await fetch("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
    const created = await createResponse.json().catch(() => ({}))
    if (!createResponse.ok) {
      setError(created.error ?? "新增學生失敗")
      return
    }

    const enrollResponse = await fetch(`/api/courses/${courseId}/students`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: created.id })
    })
    const enrolled = await enrollResponse.json().catch(() => ({}))
    if (!enrollResponse.ok) {
      setError(enrolled.error ?? "學生已建立，但加入課程失敗")
      return
    }

    formRef.current?.reset()
    setMessage("學生已新增並加入課程")
    startTransition(() => router.refresh())
  }

  return (
    <section className="panel">
      <h2>新增學生</h2>
      <form ref={formRef} onSubmit={onSubmit}>
        <div className="toolbar">
          <div className="field">
            <label>學號</label>
            <input name="studentCode" required />
          </div>
          <div className="field">
            <label>姓名</label>
            <input name="name" required />
          </div>
          <div className="field">
            <label>Google Email</label>
            <input name="googleEmail" type="email" />
          </div>
        </div>
        <button className="btn" type="submit" disabled={isPending}>
          {isPending ? "新增中" : "新增並加入課程"}
        </button>
      </form>
      {message && <p>{message}</p>}
      {error && <p style={{ color: "#b42318" }}>{error}</p>}
    </section>
  )
}
