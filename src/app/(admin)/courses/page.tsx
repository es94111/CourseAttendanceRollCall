import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { CourseForm } from "@/components/admin/CourseForm"
import { CourseListTable } from "@/components/admin/CourseListTable"
import { PageHeader } from "@/components/shared/PageHeader"

export default async function CoursesPage() {
  const courses = await prisma.course.findMany({
    where: { status: "active" },
    include: { _count: { select: { enrollments: true } } },
    orderBy: { createdAt: "desc" }
  })
  return (
    <main className="shell">
      <PageHeader
        eyebrow="日常工作"
        title="課程與點名"
        description="從課程進入學生名單、開啟即時點名，並追蹤每一次出席結果。"
      >
        <Link className="btn secondary" href="/courses/archived">
          查看封存課程
        </Link>
      </PageHeader>
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
