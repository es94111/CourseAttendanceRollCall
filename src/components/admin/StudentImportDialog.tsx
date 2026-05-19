"use client"

import { useState } from "react"

export function StudentImportDialog({ courseId }: { courseId?: string }) {
  const [result, setResult] = useState<any>(null)
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState("")

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
      location.reload()
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="panel">
      <h2>CSV 匯入學生</h2>
      <input type="file" accept=".csv,text/csv" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
      <button className="btn" type="button" disabled={isUploading} onClick={upload}>
        {isUploading ? "匯入中" : "匯入 CSV"}
      </button>
      {error && <p style={{ color: "#b42318" }}>{error}</p>}
      {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
    </div>
  )
}
