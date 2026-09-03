import { z } from "zod"

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/
const MAX_NAME_LENGTH = 120
const MAX_ID_LENGTH = 64
const MAX_REASON_LENGTH = 500

const courseBaseSchema = z.object({
  name: z.string().trim().min(1, "課程名稱必填").max(MAX_NAME_LENGTH, "課程名稱過長"),
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(timePattern, "開始時間格式需為 HH:MM"),
  endTime: z.string().regex(timePattern, "結束時間格式需為 HH:MM"),
  lateThresholdMinutes: z
    .number()
    .int()
    .min(0)
    .max(24 * 60)
    .default(0)
})

export const courseSchema = courseBaseSchema.refine((data) => data.endTime > data.startTime, {
  message: "結束時間必須晚於開始時間",
  path: ["endTime"]
})

export const coursePatchSchema = courseBaseSchema
  .partial()
  .refine(
    (data: Partial<z.infer<typeof courseBaseSchema>>) =>
      !data.startTime || !data.endTime || data.endTime > data.startTime,
    { message: "結束時間必須晚於開始時間", path: ["endTime"] }
  )

export const studentSchema = z.object({
  studentCode: z.string().trim().max(64, "學號過長").optional().or(z.literal("")),
  name: z.string().trim().min(1, "姓名必填").max(MAX_NAME_LENGTH, "姓名過長"),
  googleEmail: z
    .string()
    .trim()
    .max(254, "Google Email 過長")
    .email("Google Email 格式不符")
    .optional()
    .or(z.literal(""))
})

export const sessionCreateSchema = z.object({
  officialStartTime: z.string().datetime({ offset: true }),
  autoExpireMinutes: z
    .number()
    .int()
    .positive()
    .max(24 * 60)
    .optional()
    .nullable(),
  qrCodeValiditySeconds: z.number().int().min(5).max(300).default(15),
  gracePeriodSeconds: z.number().int().positive().max(600).default(60)
})

export const sessionSettingsPatchSchema = z.object({
  qrCodeValiditySeconds: z.number().int().min(5).max(300)
})

export const roleSchema = z.object({ role: z.enum(["admin", "student"]) })
export const attendanceSchema = z.object({
  token: z.string().min(1).max(512, "Token 過長"),
  sessionId: z.string().min(1).max(MAX_ID_LENGTH, "Session ID 過長")
})
export const leaveSchema = z.object({
  studentId: z.string().min(1).max(MAX_ID_LENGTH, "學生 ID 過長"),
  sessionId: z.string().min(1).max(MAX_ID_LENGTH, "Session ID 過長"),
  reason: z.string().trim().min(1).max(MAX_REASON_LENGTH, "原因過長")
})
export const manualAttendanceSchema = z.object({
  status: z.enum(["on_time", "late", "leave", "absent"]),
  studentId: z.string().max(MAX_ID_LENGTH, "學生 ID 過長").optional(),
  sessionId: z.string().max(MAX_ID_LENGTH, "Session ID 過長").optional(),
  reason: z.string().trim().min(1).max(MAX_REASON_LENGTH, "原因過長")
})

export const allowedEmailDomainsSchema = z.object({
  domains: z
    .array(
      z.object({
        domain: z.string().trim().min(1).max(253, "網域過長"),
        note: z.string().trim().max(MAX_REASON_LENGTH, "備註過長").optional().nullable()
      })
    )
    .max(200, "網域規則數量過多")
})

export const connectionAccessRulesSchema = z.object({
  rules: z
    .array(
      z.object({
        action: z.enum(["allow", "block"]),
        targetType: z.enum(["country", "ip", "asn"]),
        value: z.string().trim().min(1).max(255, "規則值過長"),
        note: z.string().trim().max(MAX_REASON_LENGTH, "備註過長").optional().nullable(),
        enabled: z.boolean().default(true)
      })
    )
    .max(500, "連線規則數量過多")
})
