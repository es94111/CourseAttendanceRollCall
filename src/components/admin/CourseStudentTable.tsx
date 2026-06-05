"use client"

import { useMemo, useState } from "react"
import { DeleteStudentDataButton } from "@/components/admin/DeleteStudentDataButton"
import { EditStudentButton } from "@/components/admin/EditStudentButton"
import { RemoveStudentFromCourseButton } from "@/components/admin/RemoveStudentFromCourseButton"

interface CourseStudentRow {
  id: string
  studentCode: string | null
  name: string
  googleEmail: string | null
}

export function CourseStudentTable({
  courseId,
  students,
  readonly = false
}: {
  courseId: string
  students: CourseStudentRow[]
  readonly?: boolean
}) {
  const [query, setQuery] = useState("")
  const [sortKey, setSortKey] = useState<"code" | "name" | "email">("code")
  const rows = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return students
      .filter((student) =>
        [student.studentCode ?? "", student.name, student.googleEmail ?? ""].join(" ").toLowerCase().includes(normalized)
      )
      .sort((a, b) => {
        if (sortKey === "name") return a.name.localeCompare(b.name, "zh-Hant")
        if (sortKey === "email") return (a.googleEmail ?? "").localeCompare(b.googleEmail ?? "")
        return (a.studentCode ?? "").localeCompare(b.studentCode ?? "")
      })
  }, [query, sortKey, students])

  return (
    <div>
      <div className="toolbar">
        <input placeholder="搜尋學號、姓名、Email" value={query} onChange={(event) => setQuery(event.target.value)} />
        <select value={sortKey} onChange={(event) => setSortKey(event.target.value as typeof sortKey)}>
          <option value="code">依學號排序</option>
          <option value="name">依姓名排序</option>
          <option value="email">依 Email 排序</option>
        </select>
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
              <th>資料</th>
              <th>課程</th>
              <th>個資</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((student) => (
              <tr key={student.id}>
                <td>{student.studentCode ?? "-"}</td>
                <td>{student.name}</td>
                <td>{student.googleEmail ?? "-"}</td>
                <td>{readonly ? "-" : <EditStudentButton student={student} />}</td>
                <td>{readonly ? "-" : <RemoveStudentFromCourseButton courseId={courseId} studentId={student.id} />}</td>
                <td>{readonly ? "-" : <DeleteStudentDataButton studentId={student.id} />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
