"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

export function ArchiveCourseButton({
  courseId,
  redirectTo
}: {
  courseId: string
  redirectTo?: string
}) {
  const router = useRouter()
  const [error, setError] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [isPending, startTransition] = useTransition()

  async function archiveCourse() {
    setError("")
    if (!window.confirm("確定要封存此課程？封存後課程會變成唯讀，不能再開啟新的點名。")) return
    setIsSaving(true)
    try {
      const response = await fetch(`/api/courses/${courseId}`, { method: "DELETE" })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(body.error ?? "封存課程失敗")
        return
      }
      startTransition(() => {
        if (redirectTo) router.push(redirectTo)
        else router.refresh()
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <span>
      <button className="btn secondary" type="button" disabled={isSaving || isPending} onClick={archiveCourse}>
        {isSaving || isPending ? "封存中" : "封存課程"}
      </button>
      {error && <span style={{ color: "#b42318", marginLeft: 8 }}>{error}</span>}
    </span>
  )
}
