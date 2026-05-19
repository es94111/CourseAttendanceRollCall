"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

export function RemoveStudentFromCourseButton({
  courseId,
  studentId
}: {
  courseId: string
  studentId: string
}) {
  const router = useRouter()
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()

  async function onClick() {
    setError("")
    if (!window.confirm("確定要將此學生從課程移除？")) return
    const response = await fetch(`/api/courses/${courseId}/students/${studentId}`, {
      method: "DELETE"
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) {
      setError(body.error ?? "移除學生失敗")
      return
    }
    startTransition(() => router.refresh())
  }

  return (
    <span>
      <button className="btn secondary" type="button" disabled={isPending} onClick={onClick}>
        {isPending ? "移除中" : "移出課程"}
      </button>
      {error && <span style={{ color: "#b42318", marginLeft: 8 }}>{error}</span>}
    </span>
  )
}
