"use client"

import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState, useTransition } from "react"

interface StudentOption {
  id: string
  studentCode: string | null
  name: string
  googleEmail: string | null
}

export function ExistingStudentPicker({
  courseId,
  enrolledStudentIds
}: {
  courseId: string
  enrolledStudentIds: string[]
}) {
  const router = useRouter()
  const [students, setStudents] = useState<StudentOption[]>([])
  const [studentId, setStudentId] = useState("")
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    fetch("/api/students")
      .then((response) => response.json())
      .then((body) => setStudents(Array.isArray(body) ? body : []))
      .catch(() => setError("讀取學生清單失敗"))
  }, [])

  const options = useMemo(
    () => students.filter((student) => !enrolledStudentIds.includes(student.id)),
    [students, enrolledStudentIds]
  )

  async function addStudent() {
    setError("")
    setMessage("")
    if (!studentId) {
      setError("請選擇學生")
      return
    }
    const response = await fetch(`/api/courses/${courseId}/students`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId })
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) {
      setError(body.error ?? "加入學生失敗")
      return
    }
    setStudentId("")
    setMessage("學生已加入課程")
    startTransition(() => router.refresh())
  }

  return (
    <section className="panel">
      <h2>加入既有學生</h2>
      <div className="toolbar">
        <select value={studentId} onChange={(event) => setStudentId(event.target.value)}>
          <option value="">選擇學生</option>
          {options.map((student) => (
            <option key={student.id} value={student.id}>
              {student.studentCode ? `${student.studentCode} ` : ""}{student.name} {student.googleEmail ? `(${student.googleEmail})` : ""}
            </option>
          ))}
        </select>
        <button className="btn" type="button" disabled={isPending || options.length === 0} onClick={addStudent}>
          {isPending ? "加入中" : "加入課程"}
        </button>
      </div>
      {options.length === 0 && <p>沒有可加入的既有學生。</p>}
      {message && <p>{message}</p>}
      {error && <p style={{ color: "#b42318" }}>{error}</p>}
    </section>
  )
}
