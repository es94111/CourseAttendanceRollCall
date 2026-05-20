import Link from "next/link"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { CourseForm } from "@/components/admin/CourseForm"
import { StudentImportDialog } from "@/components/admin/StudentImportDialog"
import { DataTable } from "@/components/shared/DataTable"
import { DeleteStudentDataButton } from "@/components/admin/DeleteStudentDataButton"
import { StudentManager } from "@/components/admin/StudentManager"
import { OpenSessionForm } from "@/components/admin/OpenSessionForm"
import { RemoveStudentFromCourseButton } from "@/components/admin/RemoveStudentFromCourseButton"
import { ExistingStudentPicker } from "@/components/admin/ExistingStudentPicker"

export default async function CourseDetailPage({ params }: any) {
  const course = await prisma.course.findUnique({
    where: { id: params.id },
    include: {
      enrollments: { include: { student: true } },
      sessions: { orderBy: { createdAt: "desc" } }
    }
  })
  if (!course) notFound()
  const readonly = course.status === "archived"
  return (
    <main className="shell">
      <div className="toolbar">
        <h1>{course.name}</h1>
        <Link className="btn" href={`/statistics/${course.id}`}>
          出席統計
        </Link>
      </div>
      {!readonly ? (
        <>
          <CourseForm
            course={{
              id: course.id,
              name: course.name,
              dayOfWeek: course.dayOfWeek,
              startTime: course.startTime,
              endTime: course.endTime,
              lateThresholdMinutes: course.lateThresholdMinutes
            }}
          />
          <OpenSessionForm courseId={course.id} defaultStartTime={course.startTime} />
          <StudentManager courseId={course.id} />
          <ExistingStudentPicker
            courseId={course.id}
            enrolledStudentIds={course.enrollments.map((enrollment) => enrollment.studentId)}
          />
          <StudentImportDialog courseId={course.id} />
        </>
      ) : (
        <p className="panel">封存課程為唯讀模式。</p>
      )}
      <section className="panel">
        <h2>學生名單</h2>
        <DataTable
          rows={course.enrollments.map((item) => item.student)}
          columns={[
            { key: "code", header: "學號", render: (row) => row.studentCode },
            { key: "name", header: "姓名", render: (row) => row.name },
            { key: "email", header: "Google Email", render: (row) => row.googleEmail ?? "-" },
            {
              key: "remove",
              header: "課程",
              render: (row) =>
                readonly ? null : <RemoveStudentFromCourseButton courseId={course.id} studentId={row.id} />
            },
            {
              key: "delete",
              header: "個資",
              render: (row) =>
                readonly ? null : (
                  <DeleteStudentDataButton studentId={row.id} />
                )
            }
          ]}
        />
      </section>
      <section className="panel">
        <h2>歷史 Session</h2>
        <DataTable
          rows={course.sessions}
          columns={[
            { key: "id", header: "Session", render: (row) => <Link href={`/sessions/${row.id}`}>{row.id}</Link> },
            { key: "status", header: "狀態", render: (row) => <span className="badge">{row.status}</span> },
            { key: "createdAt", header: "建立時間", render: (row) => row.createdAt.toLocaleString("zh-TW", { timeZone: "Asia/Taipei" }) }
          ]}
        />
      </section>
      {/* DELETE_BUTTON_PLACEHOLDER: T064b */}
    </main>
  )
}
