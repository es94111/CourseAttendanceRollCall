"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

export function StudentImportDialog({ courseId }: { courseId?: string }) {
  const router = useRouter()
  const [result, setResult] = useState<{
    successCount: number
    skipCount: number
    errors: Array<{ row: number; reason: string }>
  } | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()

  async function upload() {
    setError("")
    setResult(null)
    if (!file) {
      setError("請選擇 CSV 檔案")
      return
    }
    const formData = new FormData()
    formData.set("file", file)
    if (courseId) formData.set("courseId", courseId)
    setIsUploading(true)
    try {
      const response = await fetch("/api/students/import", { method: "POST", body: formData })
      const body = await response.json()
      if (!response.ok) {
        setError(body.error ?? "匯入失敗")
        return
      }
      setResult(body)
      startTransition(() => router.refresh())
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="panel">
      <h2>CSV 匯入學生</h2>
      <div className="toolbar">
        <input type="file" accept=".csv,text/csv" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
        <button className="btn" type="button" disabled={isUploading || isPending} onClick={upload}>
          {isUploading || isPending ? "匯入中" : "匯入 CSV"}
        </button>
      </div>
      {error && <p style={{ color: "#b42318" }}>{error}</p>}
      {result && (
        <div>
          <div className="toolbar">
            <span className="badge">成功 {result.successCount}</span>
            <span className="badge">略過 {result.skipCount}</span>
          </div>
          {result.errors.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>列號</th>
                  <th>原因</th>
                </tr>
              </thead>
              <tbody>
                {result.errors.map((item) => (
                  <tr key={`${item.row}-${item.reason}`}>
                    <td>{item.row}</td>
                    <td>{item.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>所有資料列皆已成功匯入。</p>
          )}
        </div>
      )}
    </div>
  )
}
