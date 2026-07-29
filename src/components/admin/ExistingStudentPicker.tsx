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
  const [isLoading, setIsLoading] = useState(true)
  const [studentId, setStudentId] = useState("")
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    fetch("/api/students")
      .then((response) => response.json())
      .then((body) => setStudents(Array.isArray(body) ? body : []))
      .catch(() => setError("讀取學生清單失敗"))
      .finally(() => setIsLoading(false))
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
    <section className="panel roster-tool-card">
      <div className="panel-header">
        <div>
          <p className="section-kicker">跨課程沿用</p>
          <h2>加入既有學生</h2>
          <p>學生已存在於其他課程時，不必重複建立資料。</p>
        </div>
      </div>
      <div className="field">
        <label htmlFor="existing-student">選擇尚未加入本課程的學生</label>
        <select
          id="existing-student"
          value={studentId}
          disabled={isLoading || options.length === 0}
          onChange={(event) => setStudentId(event.target.value)}
        >
          <option value="">{isLoading ? "正在讀取學生…" : "請選擇學生"}</option>
          {options.map((student) => (
            <option key={student.id} value={student.id}>
              {student.studentCode ? `${student.studentCode} ` : ""}
              {student.name} {student.googleEmail ? `(${student.googleEmail})` : ""}
            </option>
          ))}
        </select>
      </div>
      <button
        className="btn roster-tool-action"
        type="button"
        disabled={isPending || !studentId}
        onClick={addStudent}
      >
        {isPending ? "加入中…" : "加入課程"}
      </button>
      {!isLoading && options.length === 0 && (
        <p className="tool-hint">所有既有學生都已加入本課程。</p>
      )}
      {message && (
        <p className="inline-feedback success" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="inline-feedback error" role="alert">
          {error}
        </p>
      )}
    </section>
  )
}
