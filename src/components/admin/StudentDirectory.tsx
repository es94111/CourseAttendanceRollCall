"use client"

import { useMemo, useState } from "react"

interface StudentRow {
  id: string
  studentCode: string
  name: string
  googleEmail: string | null
  courses: Array<{ id: string; name: string }>
}

export function StudentDirectory({ students }: { students: StudentRow[] }) {
  const [query, setQuery] = useState("")
  const [linkedOnly, setLinkedOnly] = useState(false)
  const rows = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return students.filter((student) => {
      const matches = [student.studentCode, student.name, student.googleEmail ?? "", ...student.courses.map((course) => course.name)]
        .join(" ")
        .toLowerCase()
        .includes(normalized)
      return matches && (!linkedOnly || Boolean(student.googleEmail))
    })
  }, [linkedOnly, query, students])

  return (
    <section className="panel">
      <div className="toolbar">
        <input placeholder="搜尋學號、姓名、Email、課程" value={query} onChange={(event) => setQuery(event.target.value)} />
        <label>
          <input type="checkbox" checked={linkedOnly} onChange={(event) => setLinkedOnly(event.target.checked)} /> 只看已綁定 Email
        </label>
      </div>
      {rows.length === 0 ? (
        <p className="empty-state">沒有符合條件的學生。</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>學號</th>
              <th>姓名</th>
              <th>Google Email</th>
              <th>課程</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((student) => (
              <tr key={student.id}>
                <td>{student.studentCode}</td>
                <td>{student.name}</td>
                <td>{student.googleEmail ?? "-"}</td>
                <td>{student.courses.map((course) => course.name).join("、") || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
