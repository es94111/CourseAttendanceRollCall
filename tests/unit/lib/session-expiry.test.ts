import { describe, expect, it } from "vitest"
import { attendanceStatus } from "@/lib/session-expiry"

describe("attendanceStatus", () => {
  it("uses the session opened time as the late threshold baseline", () => {
    const sessionOpenedAt = new Date("2026-05-20T12:10:00+08:00")
    const attendedAt = new Date("2026-05-20T12:11:00+08:00")

    expect(attendanceStatus(attendedAt, sessionOpenedAt, 20)).toBe("on_time")
  })

  it("marks attendance late after the session opened time plus threshold", () => {
    const sessionOpenedAt = new Date("2026-05-20T12:10:00+08:00")
    const attendedAt = new Date("2026-05-20T12:31:00+08:00")

    expect(attendanceStatus(attendedAt, sessionOpenedAt, 20)).toBe("late")
  })
})
