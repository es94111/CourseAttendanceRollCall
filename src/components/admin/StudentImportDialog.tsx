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
    <section className="panel roster-tool-card">
      <div className="panel-header">
        <div>
          <p className="section-kicker">批次處理</p>
          <h2>CSV 匯入學生</h2>
          <p>適合一次加入整班名單，重複資料會自動略過。</p>
        </div>
      </div>
      <label className="file-drop" htmlFor={`student-csv-${courseId ?? "all"}`}>
        <span className="file-drop-icon" aria-hidden>
          CSV
        </span>
        <span>
          <strong>{file ? file.name : "選擇 CSV 檔案"}</strong>
          <small>必須包含「姓名」；未填 Google Email 的學生需由管理員補齊後才能簽到</small>
        </span>
        <input
          id={`student-csv-${courseId ?? "all"}`}
          type="file"
          accept=".csv,text/csv"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
      </label>
      <button
        className="btn roster-tool-action"
        type="button"
        disabled={isUploading || isPending || !file}
        onClick={upload}
      >
        {isUploading || isPending ? "匯入中…" : "開始匯入"}
      </button>
      {error && (
        <p className="inline-feedback error" role="alert">
          {error}
        </p>
      )}
      {result && (
        <div className="import-result">
          <div className="flex gap-2 flex-wrap">
            <span className="badge success">成功 {result.successCount}</span>
            <span className="badge muted">略過 {result.skipCount}</span>
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
            <p className="inline-feedback success">所有資料列皆已成功匯入。</p>
          )}
        </div>
      )}
    </section>
  )
}
