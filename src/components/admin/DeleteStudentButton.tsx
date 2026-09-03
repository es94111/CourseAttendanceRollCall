"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Dialog } from "@/components/shared/Dialog"

export function DeleteStudentButton({
  studentId,
  studentName
}: {
  studentId: string
  studentName: string
}) {
  const router = useRouter()
  const [error, setError] = useState("")
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isPending, startTransition] = useTransition()

  async function deleteStudent() {
    setError("")
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/students/${studentId}?confirmed=true`, {
        method: "DELETE"
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(body.error ?? "刪除學生失敗")
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
        {isDeleting || isPending ? "刪除中" : "刪除"}
      </button>
      {error && <span style={{ color: "#b42318", marginLeft: 8 }}>{error}</span>}
      <Dialog title="刪除學生" open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <p>
          確定要刪除「{studentName}」？此操作會刪除學生資料、選課關聯、請假與點名紀錄，無法復原。
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
          <button
            className="btn danger"
            type="button"
            disabled={isDeleting || isPending}
            onClick={deleteStudent}
          >
            確認刪除
          </button>
        </div>
      </Dialog>
    </span>
  )
}
