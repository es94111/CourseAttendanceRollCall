import Link from "next/link"
import { DeleteArchivedCourseButton } from "@/components/admin/DeleteArchivedCourseButton"
import { DataTable } from "@/components/shared/DataTable"
import { PageHeader } from "@/components/shared/PageHeader"
import { prisma } from "@/lib/prisma"

export default async function ArchivedCoursesPage() {
  const courses = await prisma.course.findMany({ where: { status: "archived" } })
  return (
    <main className="shell">
      <PageHeader
        eyebrow="歷史資料"
        title="封存課程"
        description="封存課程為唯讀；只有確定不再需要稽核資料時才永久刪除。"
        backHref="/courses"
        backLabel="返回課程"
      />
      <section className="panel data-panel">
        <div className="panel-header">
          <div>
            <h2>課程清單</h2>
            <p>共 {courses.length} 門已封存課程</p>
          </div>
        </div>
        {courses.length === 0 ? (
          <div className="empty-state compact">
            <span className="empty-icon" aria-hidden>
              ✓
            </span>
            <h2>目前沒有封存課程</h2>
            <p>封存後的課程會出現在這裡。</p>
          </div>
        ) : (
          <DataTable
            rows={courses}
            columns={[
              {
                key: "name",
                header: "課程",
                render: (row) => <Link href={`/courses/${row.id}`}>{row.name}</Link>
              },
              { key: "time", header: "時間", render: (row) => `${row.startTime}–${row.endTime}` },
              {
                key: "updated",
                header: "最後更新",
                render: (row) => row.updatedAt.toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })
              },
              {
                key: "actions",
                header: "操作",
                render: (row) => (
                  <DeleteArchivedCourseButton courseId={row.id} courseName={row.name} />
                )
              }
            ]}
          />
        )}
      </section>
    </main>
  )
}
