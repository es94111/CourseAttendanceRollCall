"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Dialog } from "@/components/shared/Dialog"

export function DeleteArchivedCourseButton({
  courseId,
  courseName
}: {
  courseId: string
  courseName: string
}) {
  const router = useRouter()
  const [error, setError] = useState("")
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isPending, startTransition] = useTransition()

  async function deleteCourse() {
    setError("")
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/courses/${courseId}`, { method: "DELETE" })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(body.error ?? "刪除課程失敗")
        return
      }
      setConfirmOpen(false)
      startTransition(() => router.refresh())
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <span>
      <button
        className="btn danger"
        type="button"
        disabled={isDeleting || isPending}
        onClick={() => setConfirmOpen(true)}
      >
        {isDeleting || isPending ? "刪除中" : "刪除課程"}
      </button>
      {error && <span style={{ color: "#b42318", marginLeft: 8 }}>{error}</span>}
      <Dialog title="刪除封存課程" open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <p>
          確定要永久刪除「{courseName}」？此操作會刪除課程、點名 Session、點名紀錄、請假紀錄與選課關聯，無法復原。
        </p>
        <div className="toolbar dialog-actions">
          <button
            className="btn secondary"
            type="button"
            disabled={isDeleting || isPending}
            onClick={() => setConfirmOpen(false)}
          >
            取消
          </button>
          <button className="btn danger" type="button" disabled={isDeleting || isPending} onClick={deleteCourse}>
            確認刪除
          </button>
        </div>
      </Dialog>
    </span>
  )
}
