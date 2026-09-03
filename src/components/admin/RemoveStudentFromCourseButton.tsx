"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Dialog } from "@/components/shared/Dialog"

export function RemoveStudentFromCourseButton({
  courseId,
  studentId
}: {
  courseId: string
  studentId: string
}) {
  const router = useRouter()
  const [error, setError] = useState("")
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  async function onClick() {
    setError("")
    const response = await fetch(`/api/courses/${courseId}/students/${studentId}`, {
      method: "DELETE"
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) {
      setError(body.error ?? "移除學生失敗")
      return
    }
    setConfirmOpen(false)
    startTransition(() => router.refresh())
  }

  return (
    <span>
      <button
        className="btn secondary"
        type="button"
        disabled={isPending}
        onClick={() => setConfirmOpen(true)}
      >
        {isPending ? "移除中" : "移出課程"}
      </button>
      {error && <span style={{ color: "#b42318", marginLeft: 8 }}>{error}</span>}
      <Dialog title="移出課程" open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <p>確定要將此學生從課程移除？既有點名紀錄會保留。</p>
        <div className="toolbar dialog-actions">
          <button
            className="btn secondary"
            type="button"
            disabled={isPending}
            onClick={() => setConfirmOpen(false)}
          >
            取消
          </button>
          <button className="btn" type="button" disabled={isPending} onClick={onClick}>
            確認移除
          </button>
        </div>
      </Dialog>
    </span>
  )
}
