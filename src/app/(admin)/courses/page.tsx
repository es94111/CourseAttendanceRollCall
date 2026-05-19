import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { CourseForm } from "@/components/admin/CourseForm"
import { DataTable } from "@/components/shared/DataTable"

export default async function CoursesPage() {
  const courses = await prisma.course.findMany({
    where: { status: "active" },
    include: { _count: { select: { enrollments: true } } },
    orderBy: { createdAt: "desc" }
  })
  return (
    <main className="shell">
      <div className="toolbar">
        <h1>課程列表</h1>
        <Link href="/courses/archived">封存課程</Link>
      </div>
      <CourseForm />
      <DataTable
        rows={courses}
        columns={[
          { key: "name", header: "課程", render: (row) => <Link href={`/courses/${row.id}`}>{row.name}</Link>, sortValue: (row) => row.name },
          { key: "time", header: "時間", render: (row) => `${row.startTime}-${row.endTime}` },
          { key: "students", header: "學生", render: (row) => row._count.enrollments },
          { key: "stats", header: "統計", render: (row) => <Link href={`/statistics/${row.id}`}>查看</Link> }
        ]}
      />
    </main>
  )
}
