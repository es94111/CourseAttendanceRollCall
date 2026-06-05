export type UserRole = "admin" | "student"
export type CourseStatus = "active" | "archived"
export type SessionStatus = "active" | "closed" | "expired" | "voided"
export type AttendanceStatus = "on_time" | "late" | "leave" | "absent"

export type AuditEventType =
  | "export_attendance"
  | "manual_attendance_override"
  | "leave_record_add"
  | "void_session"
  | "role_change"
  | "delete_student_data"
  | "delete_user"
  | "session_opened"
  | "session_reopened"
  | "session_settings_update"
  | "connection_access_update"
  | "connection_access_block"
  | "allowed_email_domains_update"
  | "system_setting_update"
  | "student_email_bind"
  | "student_email_unbind"

export interface ApiError {
  error: string
}

export interface CourseResponse {
  id: string
  name: string
  dayOfWeek: number
  startTime: string
  endTime: string
  lateThresholdMinutes: number
  status: CourseStatus
  enrolledCount?: number
  createdAt: string
}

export interface StudentResponse {
  id: string
  studentCode: string | null
  name: string
  googleEmail: string | null
  isGoogleLinked: boolean
}

export interface AttendanceStatsResponse {
  studentId: string
  studentCode: string | null
  name: string
  onTimeCount: number
  lateCount: number
  leaveCount: number
  absentCount: number
  attendanceRate: number
}
