import { z } from "zod"

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/

const courseBaseSchema = z.object({
  name: z.string().trim().min(1, "課程名稱必填"),
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(timePattern, "開始時間格式需為 HH:MM"),
  endTime: z.string().regex(timePattern, "結束時間格式需為 HH:MM"),
  lateThresholdMinutes: z.number().int().min(0).default(0)
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
  studentCode: z.string().trim().min(1, "學號必填"),
  name: z.string().trim().min(1, "姓名必填"),
  googleEmail: z.string().trim().email("Google Email 格式不符").optional().or(z.literal(""))
})

export const sessionCreateSchema = z.object({
  officialStartTime: z.string().datetime({ offset: true }),
  autoExpireMinutes: z.number().int().positive().optional().nullable(),
  qrCodeValiditySeconds: z.number().int().min(5).default(15),
  gracePeriodSeconds: z.number().int().positive().default(60)
})

export const sessionSettingsPatchSchema = z.object({
  qrCodeValiditySeconds: z.number().int().min(5)
})

export const roleSchema = z.object({ role: z.enum(["admin", "student"]) })
export const attendanceSchema = z.object({ token: z.string().min(1), sessionId: z.string().min(1) })
export const leaveSchema = z.object({
  studentId: z.string().min(1),
  sessionId: z.string().min(1),
  reason: z.string().trim().min(1)
})
export const manualAttendanceSchema = z.object({
  status: z.enum(["on_time", "late", "leave", "absent"]),
  studentId: z.string().optional(),
  sessionId: z.string().optional(),
  reason: z.string().trim().min(1)
})

export const connectionAccessRulesSchema = z.object({
  rules: z.array(
    z.object({
      action: z.enum(["allow", "block"]),
      targetType: z.enum(["country", "ip", "asn"]),
      value: z.string().trim().min(1),
      note: z.string().trim().optional().nullable(),
      enabled: z.boolean().default(true)
    })
  )
})
