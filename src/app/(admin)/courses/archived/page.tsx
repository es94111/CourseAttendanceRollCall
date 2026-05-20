import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { DataTable } from "@/components/shared/DataTable"
import { DeleteArchivedCourseButton } from "@/components/admin/DeleteArchivedCourseButton"

export default async function ArchivedCoursesPage() {
  const courses = await prisma.course.findMany({ where: { status: "archived" } })
  return (
    <main className="shell">
      <h1>封存課程</h1>
      <DataTable
        rows={courses}
        columns={[
          { key: "name", header: "課程", render: (row) => <Link href={`/courses/${row.id}`}>{row.name}</Link> },
          { key: "time", header: "時間", render: (row) => `${row.startTime}-${row.endTime}` },
          { key: "updated", header: "更新", render: (row) => row.updatedAt.toLocaleString("zh-TW", { timeZone: "Asia/Taipei" }) },
          {
            key: "actions",
            header: "操作",
            render: (row) => <DeleteArchivedCourseButton courseId={row.id} courseName={row.name} />
          }
        ]}
      />
    </main>
  )
}
