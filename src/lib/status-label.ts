import type { AttendanceStatus, CourseStatus, SessionStatus } from "@/types"

export function attendanceStatusLabel(status: string | null | undefined) {
  const labels: Record<AttendanceStatus, string> = {
    on_time: "準時",
    late: "遲到",
    leave: "請假",
    absent: "缺席"
  }
  return status && status in labels ? labels[status as AttendanceStatus] : (status ?? "-")
}

export function sessionStatusLabel(status: string | null | undefined) {
  const labels: Record<SessionStatus, string> = {
    active: "進行中",
    closed: "已關閉",
    expired: "已逾時",
    voided: "已作廢"
  }
  return status && status in labels ? labels[status as SessionStatus] : (status ?? "-")
}

export function courseStatusLabel(status: string | null | undefined) {
  const labels: Record<CourseStatus, string> = {
    active: "使用中",
    archived: "已封存"
  }
  return status && status in labels ? labels[status as CourseStatus] : (status ?? "-")
}
