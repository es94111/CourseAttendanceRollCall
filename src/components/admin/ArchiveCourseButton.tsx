"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Dialog } from "@/components/shared/Dialog"

export function ArchiveCourseButton({
  courseId,
  redirectTo
}: {
  courseId: string
  redirectTo?: string
}) {
  const router = useRouter()
  const [error, setError] = useState("")
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isPending, startTransition] = useTransition()

  async function archiveCourse() {
    setError("")
    setIsSaving(true)
    try {
      const response = await fetch(`/api/courses/${courseId}`, { method: "DELETE" })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(body.error ?? "封存課程失敗")
        return
      }
      startTransition(() => {
        setConfirmOpen(false)
        if (redirectTo) router.push(redirectTo)
        else router.refresh()
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <span>
      <button className="btn secondary" type="button" disabled={isSaving || isPending} onClick={() => setConfirmOpen(true)}>
        {isSaving || isPending ? "封存中" : "封存課程"}
      </button>
      {error && <span style={{ color: "#b42318", marginLeft: 8 }}>{error}</span>}
      <Dialog title="封存課程" open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <p>封存後課程會變成唯讀，不能再開啟新的點名。確定要封存此課程？</p>
        <div className="toolbar dialog-actions">
          <button className="btn secondary" type="button" disabled={isSaving || isPending} onClick={() => setConfirmOpen(false)}>
            取消
          </button>
          <button className="btn" type="button" disabled={isSaving || isPending} onClick={archiveCourse}>
            確認封存
          </button>
        </div>
      </Dialog>
    </span>
  )
}
