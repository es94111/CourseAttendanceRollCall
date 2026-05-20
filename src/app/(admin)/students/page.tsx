import { prisma } from "@/lib/prisma"
import { StudentDirectory } from "@/components/admin/StudentDirectory"
import { StudentImportDialog } from "@/components/admin/StudentImportDialog"

export default async function StudentsPage() {
  const students = await prisma.student.findMany({
    include: { enrollments: { include: { course: true } } },
    orderBy: [{ studentCode: "asc" }, { name: "asc" }]
  })
  return (
    <main className="shell">
      <h1>學生總表</h1>
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
