"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { ArchiveCourseButton } from "@/components/admin/ArchiveCourseButton"

interface CourseRow {
  id: string
  name: string
  dayOfWeek: number
  startTime: string
  endTime: string
  lateThresholdMinutes: number
  enrolledCount: number
}

const dayLabels = ["日", "一", "二", "三", "四", "五", "六"]

export function CourseListTable({ courses }: { courses: CourseRow[] }) {
  const [query, setQuery] = useState("")
  const [sortKey, setSortKey] = useState<"name" | "time" | "students">("name")
  const rows = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return courses
      .filter((course) =>
        [course.name, String(course.dayOfWeek), course.startTime, course.endTime]
          .join(" ")
          .toLowerCase()
          .includes(normalized)
      )
      .sort((a, b) => {
        if (sortKey === "students") return b.enrolledCount - a.enrolledCount
        if (sortKey === "time") return `${a.dayOfWeek}${a.startTime}`.localeCompare(`${b.dayOfWeek}${b.startTime}`)
        return a.name.localeCompare(b.name, "zh-Hant")
      })
  }, [courses, query, sortKey])

  return (
    <section className="panel">
      <div className="toolbar">
        <input placeholder="搜尋課程、星期或時間" value={query} onChange={(event) => setQuery(event.target.value)} />
        <select value={sortKey} onChange={(event) => setSortKey(event.target.value as typeof sortKey)}>
          <option value="name">依課程名稱排序</option>
          <option value="time">依上課時間排序</option>
          <option value="students">依學生人數排序</option>
        </select>
      </div>
      {rows.length === 0 ? (
        <p className="empty-state">沒有符合條件的課程。</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>課程</th>
              <th>星期</th>
              <th>時間</th>
              <th>遲到門檻</th>
              <th>學生</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((course) => (
              <tr key={course.id}>
                <td>
                  <Link href={`/courses/${course.id}`}>{course.name}</Link>
                </td>
                <td>週{dayLabels[course.dayOfWeek]}</td>
                <td>
                  {course.startTime}-{course.endTime}
                </td>
                <td>{course.lateThresholdMinutes} 分</td>
                <td>{course.enrolledCount}</td>
                <td>
                  <div className="toolbar">
                    <Link href={`/statistics/${course.id}`}>統計</Link>
                    <ArchiveCourseButton courseId={course.id} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
