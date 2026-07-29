"use client"

import { useMemo, useState } from "react"
import { EditStudentButton } from "@/components/admin/EditStudentButton"
import { DeleteStudentButton } from "@/components/admin/DeleteStudentButton"

interface StudentRow {
  id: string
  studentCode: string | null
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
      const matches = [
        student.studentCode ?? "",
        student.name,
        student.googleEmail ?? "",
        ...student.courses.map((course) => course.name)
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized)
      return matches && (!linkedOnly || Boolean(student.googleEmail))
    })
  }, [linkedOnly, query, students])

  return (
    <section className="panel data-panel">
      <div className="panel-header">
        <div>
          <h2>全部學生</h2>
          <p>編輯身分資料，或確認學生所屬課程與帳號綁定狀態。</p>
        </div>
        <span className="count-badge">{students.length} 位學生</span>
      </div>
      <div className="filter-bar">
        <div className="search-field">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-4-4" />
          </svg>
          <label className="sr-only" htmlFor="student-search">
            搜尋學生
          </label>
          <input
            id="student-search"
            type="search"
            placeholder="搜尋學號、姓名、Email 或課程"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query && (
            <button type="button" className="clear-search" onClick={() => setQuery("")}>
              清除
            </button>
          )}
        </div>
        <label className="check-filter">
          <input
            type="checkbox"
            checked={linkedOnly}
            onChange={(event) => setLinkedOnly(event.target.checked)}
          />
          <span>只看已綁定帳號</span>
        </label>
      </div>
      {rows.length === 0 ? (
        <div className="empty-state compact">
          <h2>沒有符合條件的學生</h2>
          <p>請調整搜尋文字或取消綁定篩選。</p>
          <button
            className="btn secondary"
            type="button"
            onClick={() => {
              setQuery("")
              setLinkedOnly(false)
            }}
          >
            清除篩選
          </button>
        </div>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>學號</th>
                <th>姓名</th>
                <th>Google Email</th>
                <th>課程</th>
                <th>資料</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((student) => (
                <tr key={student.id}>
                  <td>{student.studentCode ?? <span className="text-muted">未填寫</span>}</td>
                  <td>
                    <strong>{student.name}</strong>
                  </td>
                  <td>
                    {student.googleEmail ? (
                      <span className="badge success">已綁定</span>
                    ) : (
                      <span className="badge muted">待綁定</span>
                    )}
                    {student.googleEmail && (
                      <span className="table-secondary email-value">{student.googleEmail}</span>
                    )}
                  </td>
                  <td>{student.courses.map((course) => course.name).join("、") || "-"}</td>
                  <td>
                    <EditStudentButton student={student} />
                  </td>
                  <td>
                    <DeleteStudentButton studentId={student.id} studentName={student.name} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
