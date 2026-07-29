import Link from "next/link"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { CourseForm } from "@/components/admin/CourseForm"
import { StudentImportDialog } from "@/components/admin/StudentImportDialog"
import { DataTable } from "@/components/shared/DataTable"
import { StudentManager } from "@/components/admin/StudentManager"
import { OpenSessionForm } from "@/components/admin/OpenSessionForm"
import { ExistingStudentPicker } from "@/components/admin/ExistingStudentPicker"
import { ArchiveCourseButton } from "@/components/admin/ArchiveCourseButton"
import { CourseStudentTable } from "@/components/admin/CourseStudentTable"
import { PageHeader } from "@/components/shared/PageHeader"

const dayLabels = ["日", "一", "二", "三", "四", "五", "六"]

export default async function CourseDetailPage(props: any) {
  const params = await props.params
  const course = await prisma.course.findUnique({
    where: { id: params.id },
    include: {
      enrollments: { include: { student: true } },
      sessions: { orderBy: { createdAt: "desc" } }
    }
  })
  if (!course) notFound()
  const readonly = course.status === "archived"
  const activeSession = course.sessions.find((session) => session.status === "active")
  const sessionsWithOrder = course.sessions.map((session) => ({
    ...session,
    order: course.sessions.filter((item) => item.createdAt <= session.createdAt).length
  }))
  return (
    <main className="shell">
      <PageHeader
        eyebrow={readonly ? "封存課程" : "課程工作區"}
        title={course.name}
        description={
          readonly
            ? "此課程已封存，目前只能查看名單、歷史點名與出席統計。"
            : "依序確認點名時間、管理學生名單，再開始本次點名。"
        }
        backHref={readonly ? "/courses/archived" : "/courses"}
        backLabel={readonly ? "返回封存課程" : "返回課程列表"}
      >
        <Link className="btn" href={`/statistics/${course.id}`}>
          出席統計
        </Link>
        {!readonly && <ArchiveCourseButton courseId={course.id} redirectTo="/courses" />}
      </PageHeader>

      <section className="course-overview" aria-label="課程摘要">
        <div>
          <span>固定上課日</span>
          <strong>星期{dayLabels[course.dayOfWeek]}</strong>
        </div>
        <div>
          <span>上課時間</span>
          <strong className="tabular">
            {course.startTime}–{course.endTime}
          </strong>
        </div>
        <div>
          <span>學生人數</span>
          <strong>{course.enrollments.length} 人</strong>
        </div>
        <div>
          <span>歷史點名</span>
          <strong>{course.sessions.length} 次</strong>
        </div>
        <div>
          <span>目前狀態</span>
          <strong className={activeSession ? "text-success" : ""}>
            {readonly ? "已封存" : activeSession ? "點名進行中" : "可開啟點名"}
          </strong>
        </div>
      </section>

      {!readonly && (
        <div className="workflow-block">
          <div className="workflow-label">
            <span>1</span>
            <div>
              <strong>開始本次點名</strong>
              <p>確認官方開始時間與有效秒數後，系統會建立動態 QR Code。</p>
            </div>
          </div>
          <OpenSessionForm
            courseId={course.id}
            defaultStartTime={course.startTime}
            activeSessionId={activeSession?.id}
          />
        </div>
      )}

      <section className="panel data-panel roster-section">
        <div className="panel-header">
          <div>
            <p className="section-kicker">{readonly ? "課程資料" : "步驟 2"}</p>
            <h2>學生名單</h2>
            <p>
              {readonly
                ? "封存課程名單僅供查閱。"
                : "點名前確認學生都已加入，並由管理員完成 Google Email 綁定。"}
            </p>
          </div>
          <span className="count-badge">{course.enrollments.length} 位學生</span>
        </div>
        <CourseStudentTable
          courseId={course.id}
          readonly={readonly}
          students={course.enrollments.map((item) => ({
            id: item.student.id,
            studentCode: item.student.studentCode,
            name: item.student.name,
            googleEmail: item.student.googleEmail
          }))}
        />
      </section>

      {!readonly && (
        <div className="roster-tools-grid">
          <StudentManager courseId={course.id} />
          <ExistingStudentPicker
            courseId={course.id}
            enrolledStudentIds={course.enrollments.map((enrollment) => enrollment.studentId)}
          />
          <StudentImportDialog courseId={course.id} />
        </div>
      )}

      <section className="panel data-panel">
        <div className="panel-header">
          <div>
            <p className="section-kicker">追蹤紀錄</p>
            <h2>歷史點名</h2>
            <p>每次點名均可重新進入查看明細；已作廢紀錄不會計入統計。</p>
          </div>
          <span className="count-badge">{sessionsWithOrder.length} 次</span>
        </div>
        {sessionsWithOrder.length === 0 ? (
          <div className="empty-state compact">
            <h2>尚無點名紀錄</h2>
            <p>開啟第一次點名後，紀錄會出現在這裡。</p>
          </div>
        ) : (
          <DataTable
            rows={sessionsWithOrder}
            columns={[
              {
                key: "id",
                header: "點名",
                render: (row) => <Link href={`/sessions/${row.id}`}>第 {row.order} 次點名</Link>
              },
              {
                key: "status",
                header: "狀態",
                render: (row) => (
                  <span className={`badge ${row.status}`}>
                    {row.status === "active"
                      ? "進行中"
                      : row.status === "closed"
                        ? "已關閉"
                        : row.status === "voided"
                          ? "已作廢"
                          : row.status}
                  </span>
                )
              },
              {
                key: "createdAt",
                header: "建立時間",
                render: (row) => row.createdAt.toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })
              }
            ]}
          />
        )}
      </section>

      {!readonly && (
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
      )}
    </main>
  )
}
