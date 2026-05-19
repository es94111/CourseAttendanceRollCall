"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

export function DeleteStudentDataButton({ studentId }: { studentId: string }) {
  const router = useRouter()
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()

  async function onClick() {
    setError("")
    const confirmed = window.confirm(
      "刪除個人資料\n此操作會匿名化學生姓名與登入資料，並清除點名 IP 與裝置資訊。"
    )
    if (!confirmed) return

    const response = await fetch(`/api/students/${studentId}/data?confirmed=true`, { method: "DELETE" })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) {
      setError(body.error ?? "刪除個資失敗")
      return
    }
    startTransition(() => router.refresh())
  }

  return (
    <span>
      <button className="btn secondary" type="button" disabled={isPending} onClick={onClick}>
        {isPending ? "刪除中" : "刪除個資"}
      </button>
      {error && <span style={{ color: "#b42318", marginLeft: 8 }}>{error}</span>}
    </span>
  )
}
