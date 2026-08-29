import { attendanceStatusLabel } from "@/lib/status-label"

export interface AuditLogRow {
  id: string
  eventType: string
  actorEmail: string
  target: unknown
  oldValue?: unknown
  newValue?: unknown
  reason: string | null
  createdAt: string
}

const eventLabels: Record<string, string> = {
  export_attendance: "匯出點名資料",
  manual_attendance_override: "手動補登點名",
  leave_record_add: "新增請假記錄",
  void_session: "作廢點名 Session",
  role_change: "變更使用者角色",
  delete_student_data: "刪除學生個資",
  delete_user: "刪除使用者",
  session_opened: "開啟點名",
  session_settings_update: "更新點名設定",
  connection_access_update: "更新連線限制",
  connection_access_block: "封鎖連線",
  allowed_email_domains_update: "更新 Google 登入網域",
  system_setting_update: "更新系統設定",
  student_email_bind: "綁定學生 Email",
  student_email_unbind: "解除學生 Email 綁定"
}

const targetLabels: Record<string, string> = {
  userId: "使用者 ID",
  userEmail: "使用者 Email",
  userName: "使用者姓名",
  userRole: "使用者角色",
  courseId: "課程 ID",
  sessionId: "點名 Session ID",
  studentId: "學生 ID",
  studentCode: "學號",
  studentName: "學生姓名",
  attendanceId: "點名記錄 ID",
  attendanceRecordId: "點名記錄 ID",
  recordId: "點名記錄 ID",
  leaveRecordId: "請假記錄 ID",
  startDate: "開始日期",
  endDate: "結束日期",
  total: "筆數",
  ipAddress: "IP",
  ipCountry: "國家",
  ipCountryName: "國家名稱",
  ipAsn: "ASN",
  ipAsnName: "ASN 名稱",
  userAgent: "瀏覽器",
  path: "路徑",
  matchedRule: "命中規則",
  bindMethod: "綁定方式"
}

const valueLabels: Record<string, string> = {
  qrCodeValiditySeconds: "QR Code 有效秒數",
  gracePeriodSeconds: "OAuth 寬限秒數",
  officialStartTime: "官方開始時間",
  role: "角色",
  status: "點名狀態",
  attendedAt: "點名時間",
  isManual: "記錄方式",
  googleEmail: "Google Email",
  bindMethod: "綁定方式"
}

const targetDisplayKeys = new Set(["courseName", "sessionLabel", "userDisplay", "studentDisplay"])

const dateTimeKeys = new Set(["officialStartTime", "attendedAt", "createdAt", "updatedAt"])

function objectValue(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function nonEmptyString(value: unknown) {
  return typeof value === "string" && value ? value : null
}

function sameValue(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right)
}

export function eventLabel(eventType: string) {
  return eventLabels[eventType] ?? eventType
}

export function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const parts = new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? ""
  return `${part("year")}/${part("month")}/${part("day")} ${part("hour")}:${part("minute")}:${part("second")}`
}

function formatValue(key: string, value: unknown, missingLabel = "—") {
  if (value === null || value === undefined || value === "") return missingLabel
  if (key === "status") return attendanceStatusLabel(String(value))
  if (key === "isManual") return value ? "手動補登／調整" : "系統點名"
  if (key === "bindMethod") {
    if (value === "name_match") return "Google 顯示名稱比對"
    if (value === "email") return "Email 設定"
  }
  if (key === "role") {
    if (value === "admin") return "管理員"
    if (value === "student") return "學生"
  }
  if (dateTimeKeys.has(key) && typeof value === "string") return formatDateTime(value)
  if (typeof value === "boolean") return value ? "是" : "否"
  if (typeof value === "object") return JSON.stringify(value)
  return String(value)
}

function manualAttendanceDescription(log: AuditLogRow, target: Record<string, unknown>) {
  const oldValue = objectValue(log.oldValue)
  const newValue = objectValue(log.newValue)
  const student = nonEmptyString(target.studentDisplay) ?? "該學生"
  const courseName = nonEmptyString(target.courseName)
  const sessionLabel = nonEmptyString(target.sessionLabel)
  const session =
    courseName && sessionLabel
      ? `「${courseName}」${sessionLabel}`
      : courseName
        ? `課程「${courseName}」的點名`
        : sessionLabel
          ? sessionLabel
          : "這次點名"
  const oldStatus = nonEmptyString(oldValue?.status)
  const newStatus = nonEmptyString(newValue?.status)

  if (!oldValue && newStatus) {
    return `為${student}補登${session}，狀態為「${attendanceStatusLabel(newStatus)}」`
  }
  if (oldStatus && newStatus && oldStatus !== newStatus) {
    return `將${student}在${session}的狀態由「${attendanceStatusLabel(oldStatus)}」更新為「${attendanceStatusLabel(newStatus)}」`
  }
  if (newStatus) {
    return `手動確認${student}在${session}的狀態為「${attendanceStatusLabel(newStatus)}」`
  }
  return `手動調整${student}在${session}的點名記錄`
}

export function formatAuditDescription(log: AuditLogRow) {
  const target = objectValue(log.target)
  if (!target) return String(log.target ?? "未提供目標資料")
  const courseName = String(target.courseName ?? "此課程")
  const sessionLabel = String(target.sessionLabel ?? "此點名 Session")
  const userDisplay = String(target.userDisplay ?? "此使用者")

  switch (log.eventType) {
    case "session_opened":
      return `開啟課程「${courseName}」的${sessionLabel}`
    case "session_settings_update": {
      const oldValue = objectValue(log.oldValue)
      const newValue = objectValue(log.newValue)
      if (
        "qrCodeValiditySeconds" in (oldValue ?? {}) ||
        "qrCodeValiditySeconds" in (newValue ?? {})
      ) {
        return `將 QR Code 有效秒數由 ${oldValue?.qrCodeValiditySeconds ?? "—"} 秒更新為 ${newValue?.qrCodeValiditySeconds ?? "—"} 秒`
      }
      return `更新課程「${courseName}」${sessionLabel}的設定`
    }
    case "manual_attendance_override":
      return manualAttendanceDescription(log, target)
    case "delete_student_data":
      return target.studentCode ? `刪除學號 ${target.studentCode} 的學生個資` : "刪除學生個資"
    case "student_email_bind": {
      const method =
        target.bindMethod === "name_match" ? "（以 Google 顯示名稱自動比對）" : ""
      return `綁定學生「${target.studentName ?? target.studentId ?? "未知"}」的 Google Email${method}`
    }
    case "student_email_unbind":
      return `解除學生「${target.studentName ?? target.studentId ?? "未知"}」的 Google Email 綁定`
    case "delete_user":
      return `刪除使用者 ${target.userEmail ?? "未知"}（角色 ${target.userRole ?? "未知"}）`
    case "export_attendance": {
      const range =
        target.startDate === "全部時間" && target.endDate === "全部時間"
          ? "全部時間"
          : `${target.startDate ?? "最早"} 至 ${target.endDate ?? "最新"}`
      return `匯出課程「${courseName}」${range} 的點名資料，共 ${target.total ?? "—"} 筆`
    }
    case "leave_record_add":
      return "新增請假記錄並更新點名狀態"
    case "role_change":
      return `變更 ${userDisplay} 的角色`
    case "void_session":
      return `課程「${courseName}」作廢${sessionLabel}`
    case "connection_access_update":
      return `更新連線限制規則，共 ${target.total ?? "—"} 筆`
    case "allowed_email_domains_update":
      return `更新 Google 登入網域，共 ${target.total ?? "—"} 個`
    case "connection_access_block": {
      const ip = target.ipAddress ?? "未知 IP"
      const country = target.ipCountry ? `（${target.ipCountry}）` : ""
      const asn = target.ipAsn ? `，ASN ${target.ipAsn}` : ""
      return `封鎖連線來源 ${ip}${country}${asn}`
    }
    default:
      return auditTargetEntries(log)
        .map(([key, value]) => `${key}：${value}`)
        .join("，")
  }
}

export function auditTargetEntries(log: AuditLogRow): Array<[string, string]> {
  const target = objectValue(log.target)
  if (!target) return [["目標", String(log.target ?? "—")]]

  if (log.eventType === "manual_attendance_override") {
    const entries: Array<[string, string]> = []
    if (target.courseName) entries.push(["課程", String(target.courseName)])
    if (target.sessionLabel) entries.push(["點名場次", String(target.sessionLabel)])
    if (target.studentDisplay) entries.push(["學生", String(target.studentDisplay)])
    else if (target.studentId) entries.push(["學生 ID", String(target.studentId)])
    const recordId = target.attendanceRecordId ?? target.attendanceId ?? target.recordId
    if (recordId) entries.push(["點名記錄 ID", String(recordId)])
    return entries.length > 0 ? entries : [["目標", "點名記錄"]]
  }

  return Object.entries(target)
    .filter(([key]) => !targetDisplayKeys.has(key))
    .map(([key, value]) => {
      if (key === "courseId" && target.courseName) return ["課程", String(target.courseName)]
      if (key === "sessionId" && target.sessionLabel) return ["點名", String(target.sessionLabel)]
      if (key === "userId" && target.userDisplay) return ["使用者", String(target.userDisplay)]
      if (key === "studentId" && target.studentDisplay)
        return ["學生", String(target.studentDisplay)]
      return [targetLabels[key] ?? key, formatValue(key, value)]
    })
}

export interface AuditChangeEntry {
  key: string
  label: string
  oldValue: string
  newValue: string
}

export function auditChangeEntries(log: AuditLogRow): AuditChangeEntry[] {
  const oldValue = objectValue(log.oldValue) ?? {}
  const newValue = objectValue(log.newValue) ?? {}
  const oldRecordMissing = !objectValue(log.oldValue)
  const allKeys = Array.from(new Set([...Object.keys(oldValue), ...Object.keys(newValue)]))
  const keys =
    log.eventType === "manual_attendance_override"
      ? ["status", "attendedAt", "isManual"].filter((key) => allKeys.includes(key))
      : allKeys

  return keys
    .filter((key) => !sameValue(oldValue[key], newValue[key]))
    .map((key) => ({
      key,
      label: valueLabels[key] ?? targetLabels[key] ?? key,
      oldValue: oldRecordMissing && key === "status" ? "尚無紀錄" : formatValue(key, oldValue[key]),
      newValue: formatValue(key, newValue[key])
    }))
}
