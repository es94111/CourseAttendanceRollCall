import { StudentDirectory } from "@/components/admin/StudentDirectory"
import { StudentImportDialog } from "@/components/admin/StudentImportDialog"
import { PageHeader } from "@/components/shared/PageHeader"
import { prisma } from "@/lib/prisma"

export default async function StudentsPage() {
  const students = await prisma.student.findMany({
    include: { enrollments: { include: { course: true } } },
    orderBy: [{ studentCode: "asc" }, { name: "asc" }]
  })
  const linkedCount = students.filter((student) => Boolean(student.googleEmail)).length
  return (
    <main className="shell">
      <PageHeader
        eyebrow="日常工作"
        title="學生名冊"
        description="集中維護學生身分、Google 帳號綁定狀態與選課資訊。"
      />
      <section className="stat-grid student-summary">
        <div className="stat-card">
          <span>學生總數</span>
          <strong>{students.length}</strong>
        </div>
        <div className="stat-card">
          <span>已綁定 Google 帳號</span>
          <strong>{linkedCount}</strong>
        </div>
        <div className="stat-card">
          <span>待綁定</span>
          <strong>{students.length - linkedCount}</strong>
        </div>
      </section>
      <StudentImportDialog />
      <StudentDirectory
        students={students.map((student) => ({
          id: student.id,
          studentCode: student.studentCode,
          name: student.name,
          googleEmail: student.googleEmail,
          courses: student.enrollments.map(({ course }) => ({ id: course.id, name: course.name }))
        }))}
      />
    </main>
  )
}
