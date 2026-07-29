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
        if (sortKey === "time")
          return `${a.dayOfWeek}${a.startTime}`.localeCompare(`${b.dayOfWeek}${b.startTime}`)
        return a.name.localeCompare(b.name, "zh-Hant")
      })
  }, [courses, query, sortKey])

  return (
    <section className="panel data-panel">
      <div className="panel-header">
        <div>
          <h2>進行中的課程</h2>
          <p>選擇課程即可管理名單、開啟點名或查看出席統計。</p>
        </div>
        <span className="count-badge">{courses.length} 門課程</span>
      </div>

      <div className="filter-bar">
        <div className="search-field">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-4-4" />
          </svg>
          <label className="sr-only" htmlFor="course-search">
            搜尋課程
          </label>
          <input
            id="course-search"
            type="search"
            placeholder="搜尋課程名稱、星期或時間"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query && (
            <button type="button" className="clear-search" onClick={() => setQuery("")}>
              清除
            </button>
          )}
        </div>
        <div className="filter-select">
          <label htmlFor="course-sort">排序</label>
          <select
            id="course-sort"
            value={sortKey}
            onChange={(event) => setSortKey(event.target.value as typeof sortKey)}
          >
            <option value="name">課程名稱</option>
            <option value="time">上課時間</option>
            <option value="students">學生人數</option>
          </select>
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon" aria-hidden>
            ⌕
          </span>
          <h2>{courses.length === 0 ? "尚未建立課程" : "找不到符合條件的課程"}</h2>
          <p>
            {courses.length === 0
              ? "從上方的「新增課程」開始建立第一門課。"
              : "請調整搜尋文字或排序方式。"}
          </p>
          {query && (
            <button className="btn secondary" type="button" onClick={() => setQuery("")}>
              清除搜尋
            </button>
          )}
        </div>
      ) : (
        <>
          <p className="filter-summary" aria-live="polite">
            顯示 {rows.length} / {courses.length} 門課程
          </p>
          <div className="table-scroll">
            <table className="course-table">
              <thead>
                <tr>
                  <th>課程</th>
                  <th>上課時間</th>
                  <th>點名設定</th>
                  <th>學生</th>
                  <th className="actions-column">操作</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((course) => (
                  <tr key={course.id}>
                    <td data-label="課程">
                      <Link className="course-name-link" href={`/courses/${course.id}`}>
                        {course.name}
                        <span aria-hidden>→</span>
                      </Link>
                    </td>
                    <td data-label="上課時間">
                      <strong>星期{dayLabels[course.dayOfWeek]}</strong>
                      <span className="table-secondary">
                        {course.startTime}–{course.endTime}
                      </span>
                    </td>
                    <td data-label="點名設定">
                      <span className="badge muted">遲到 +{course.lateThresholdMinutes} 分</span>
                    </td>
                    <td data-label="學生">
                      <strong className="tabular">{course.enrolledCount}</strong>
                      <span className="table-secondary"> 人</span>
                    </td>
                    <td data-label="操作">
                      <div className="row-actions">
                        <Link className="btn secondary" href={`/statistics/${course.id}`}>
                          看統計
                        </Link>
                        <ArchiveCourseButton courseId={course.id} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}
