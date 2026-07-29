import { describe, expect, it } from "vitest"
import {
  attendanceSchema,
  connectionAccessRulesSchema,
  courseSchema,
  leaveSchema,
  studentSchema
} from "@/lib/validation"

describe("security-sensitive input limits", () => {
  it("rejects oversized identity and audit fields", () => {
    expect(
      studentSchema.safeParse({
        studentCode: "S".repeat(65),
        name: "N".repeat(121),
        googleEmail: ""
      }).success
    ).toBe(false)
    expect(
      leaveSchema.safeParse({
        studentId: "student",
        sessionId: "session",
        reason: "R".repeat(501)
      }).success
    ).toBe(false)
  })

  it("rejects oversized QR token and settings collections", () => {
    expect(
      attendanceSchema.safeParse({ token: "t".repeat(513), sessionId: "session" }).success
    ).toBe(false)
    expect(
      connectionAccessRulesSchema.safeParse({
        rules: Array.from({ length: 501 }, () => ({
          action: "block",
          targetType: "country",
          value: "TW",
          enabled: true
        }))
      }).success
    ).toBe(false)
  })

  it("caps course timing values to one day", () => {
    expect(
      courseSchema.safeParse({
        name: "安全課程",
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "10:00",
        lateThresholdMinutes: 1441
      }).success
    ).toBe(false)
  })
})
