import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { CourseForm } from "@/components/admin/CourseForm"
import { CourseListTable } from "@/components/admin/CourseListTable"

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
      <CourseListTable
        courses={courses.map((course) => ({
          id: course.id,
          name: course.name,
          dayOfWeek: course.dayOfWeek,
          startTime: course.startTime,
          endTime: course.endTime,
          lateThresholdMinutes: course.lateThresholdMinutes,
          enrolledCount: course._count.enrollments
        }))}
      />
    </main>
  )
}
