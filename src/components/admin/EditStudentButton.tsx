"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Dialog } from "@/components/shared/Dialog"

interface StudentInput {
  id: string
  studentCode: string
  name: string
  googleEmail: string | null
}

export function EditStudentButton({ student }: { student: StudentInput }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [isPending, startTransition] = useTransition()

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    const formData = new FormData(event.currentTarget)
    const payload = {
      studentCode: String(formData.get("studentCode") ?? "").trim(),
      name: String(formData.get("name") ?? "").trim(),
      googleEmail: String(formData.get("googleEmail") ?? "").trim()
    }
    setIsSaving(true)
    const response = await fetch(`/api/students/${student.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
    const body = await response.json().catch(() => ({}))
    setIsSaving(false)
    if (!response.ok) {
      setError(body.error ?? "更新學生資料失敗")
      return
    }
    setOpen(false)
    startTransition(() => router.refresh())
  }

  return (
    <>
      <button className="btn secondary" type="button" onClick={() => setOpen(true)}>
        編輯
      </button>
      <Dialog title="編輯學生資料" open={open} onClose={() => setOpen(false)}>
        <form onSubmit={onSubmit}>
          <div className="field">
            <label>學號</label>
            <input name="studentCode" defaultValue={student.studentCode} required />
          </div>
          <div className="field">
            <label>姓名</label>
            <input name="name" defaultValue={student.name} required />
          </div>
          <div className="field">
            <label>Google Email</label>
            <input name="googleEmail" type="email" defaultValue={student.googleEmail ?? ""} />
          </div>
          {error && <p style={{ color: "#b42318" }}>{error}</p>}
          <div className="toolbar dialog-actions">
            <button className="btn secondary" type="button" disabled={isSaving || isPending} onClick={() => setOpen(false)}>
              取消
            </button>
            <button className="btn" type="submit" disabled={isSaving || isPending}>
              {isSaving || isPending ? "儲存中" : "儲存"}
            </button>
          </div>
        </form>
      </Dialog>
    </>
  )
}
