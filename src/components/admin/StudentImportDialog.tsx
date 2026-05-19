"use client"

import { useState } from "react"

export function StudentImportDialog() {
  const [result, setResult] = useState<any>(null)
  return (
    <div className="panel">
      <input type="file" accept=".csv,text/csv" />
      <button className="btn" type="button" onClick={() => setResult({ successCount: 0, skipCount: 0, errors: [] })}>
        匯入 CSV
      </button>
      {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
    </div>
  )
}
