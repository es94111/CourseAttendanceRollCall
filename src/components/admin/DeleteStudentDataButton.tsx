"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Dialog } from "@/components/shared/Dialog"

export function DeleteStudentDataButton({ studentId }: { studentId: string }) {
  const router = useRouter()
  const [error, setError] = useState("")
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  async function onClick() {
    setError("")

    const response = await fetch(`/api/students/${studentId}/data?confirmed=true`, { method: "DELETE" })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) {
      setError(body.error ?? "刪除個資失敗")
      return
    }
    setConfirmOpen(false)
    startTransition(() => router.refresh())
  }

  return (
    <span>
      <button className="btn secondary" type="button" disabled={isPending} onClick={() => setConfirmOpen(true)}>
        {isPending ? "刪除中" : "刪除個資"}
      </button>
      {error && <span style={{ color: "#b42318", marginLeft: 8 }}>{error}</span>}
      <Dialog title="刪除個人資料" open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <p>此操作會匿名化學生姓名與登入資料，並清除點名 IP 與裝置資訊。</p>
        <div className="toolbar dialog-actions">
          <button className="btn secondary" type="button" disabled={isPending} onClick={() => setConfirmOpen(false)}>
            取消
          </button>
          <button className="btn" type="button" disabled={isPending} onClick={onClick}>
            確認刪除
          </button>
        </div>
      </Dialog>
    </span>
  )
}
