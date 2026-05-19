"use client"

import { useMemo, useState } from "react"

interface Column<T> {
  key: string
  header: string
  render: (row: T) => React.ReactNode
  sortValue?: (row: T) => string | number
}

export function DataTable<T>({ rows, columns }: { rows: T[]; columns: Column<T>[] }) {
  const [query, setQuery] = useState("")
  const [sortKey, setSortKey] = useState<string | null>(null)
  const visibleRows = useMemo(() => {
    const filtered = rows.filter((row) => JSON.stringify(row).toLowerCase().includes(query.toLowerCase()))
    if (!sortKey) return filtered
    const column = columns.find((item) => item.key === sortKey)
    return [...filtered].sort((a, b) =>
      String(column?.sortValue?.(a) ?? "").localeCompare(String(column?.sortValue?.(b) ?? ""))
    )
  }, [columns, query, rows, sortKey])

  return (
    <div>
      <input
        aria-label="搜尋"
        placeholder="搜尋"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>
                <button className="btn secondary" type="button" onClick={() => setSortKey(column.key)}>
                  {column.header}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((row, index) => (
            <tr key={index}>
              {columns.map((column) => (
                <td key={column.key}>{column.render(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
