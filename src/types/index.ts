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
  | "session_opened"
  | "session_settings_update"
  | "connection_access_update"
  | "connection_access_block"

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
  studentCode: string
  name: string
  googleEmail: string | null
  isGoogleLinked: boolean
}

export interface AttendanceStatsResponse {
  studentId: string
  studentCode: string
  name: string
  onTimeCount: number
  lateCount: number
  leaveCount: number
  absentCount: number
  attendanceRate: number
}
