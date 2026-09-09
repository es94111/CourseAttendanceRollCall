import { error, handleRouteError, requireAdmin } from "@/lib/api"
import { writeAuditLog } from "@/lib/audit"
import { attendanceRowsToCsv } from "@/lib/csv"
import { prisma } from "@/lib/prisma"
import { endOfTaipeiDay, startOfTaipeiDay } from "@/lib/time"

export async function GET(request: Request, props: any) {
  const params = await props.params
  const guard = await requireAdmin()
  if ("response" in guard) return guard.response
  try {
    const url = new URL(request.url)
    const startDate = url.searchParams.get("startDate")
    const endDate = url.searchParams.get("endDate")
    if (url.searchParams.get("confirmed") !== "true") return error("需確認 PII 匯出警告", 400)
    const dateWhere =
      startDate || endDate
        ? {
            createdAt: {
              gte: startDate ? startOfTaipeiDay(startDate) : undefined,
              lte: endDate ? endOfTaipeiDay(endDate) : undefined
            }
          }
        : {}
    const [sessions, enrollments] = await Promise.all([
      prisma.attendanceSession.findMany({
        where: { courseId: params.id, ...dateWhere },
        include: { records: { include: { student: true } } },
        orderBy: { createdAt: "asc" }
      }),
      prisma.courseEnrollment.findMany({
        where: { courseId: params.id },
        include: { student: true },
        orderBy: { createdAt: "asc" }
      })
    ])

    const enrolledStudents = enrollments.map(({ student }) => student)
    const enrolledStudentIds = new Set(enrolledStudents.map((student) => student.id))
    const rows = sessions.flatMap((session) => {
      const recordsByStudent = new Map(session.records.map((record) => [record.studentId, record]))
      const students = [...enrolledStudents]

      // Keep historical records for students who were removed from the
      // course after attending, even though they are no longer in the roster.
      for (const record of session.records) {
        if (!enrolledStudentIds.has(record.studentId)) students.push(record.student)
      }

      return students.map((student) => {
        const record = recordsByStudent.get(student.id)
        return {
          student,
          session,
          status: record?.status ?? "absent",
          attendedAt: record?.attendedAt ?? null,
          ipAddress: record?.ipAddress ?? null,
          ipCountry: record?.ipCountry ?? null,
          ipCountryName: record?.ipCountryName ?? null,
          userAgent: record?.userAgent ?? null
        }
      })
    })

    const total = rows.length
    if (total > 30_000) return error("匯出筆數超過 30,000，請縮小日期範圍", 400)
    await writeAuditLog({
      eventType: "export_attendance",
      actorId: guard.user.id,
      actorEmail: guard.user.email ?? "",
      target: {
        courseId: params.id,
        startDate: startDate ?? "全部時間",
        endDate: endDate ?? "全部時間",
        total
      }
    })
    return new Response(attendanceRowsToCsv(rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="attendance-${params.id}.csv"`
      }
    })
  } catch (cause) {
    return handleRouteError(cause)
  }
}
