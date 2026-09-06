import { describe, expect, it } from "vitest"
import { attendanceStatus } from "@/lib/session-expiry"

describe("attendanceStatus", () => {
  it("uses the official start time as the late threshold baseline", () => {
    const officialStartTime = new Date("2026-05-20T12:10:00+08:00")
    const attendedAt = new Date("2026-05-20T12:11:00+08:00")

    expect(attendanceStatus(attendedAt, officialStartTime, 20)).toBe("on_time")
  })

  it("marks attendance late after the official start time plus threshold", () => {
    const officialStartTime = new Date("2026-05-20T12:10:00+08:00")
    const attendedAt = new Date("2026-05-20T12:31:00+08:00")

    expect(attendanceStatus(attendedAt, officialStartTime, 20)).toBe("late")
  })

  it("marks check-ins before the official start time as on_time (FR-015)", () => {
    const officialStartTime = new Date("2026-05-20T12:10:00+08:00")
    const attendedAt = new Date("2026-05-20T11:55:00+08:00")

    expect(attendanceStatus(attendedAt, officialStartTime, 0)).toBe("on_time")
  })

  it("judges against the official start time even when the session opened earlier (F-1)", () => {
    // Session opened 10 minutes before the official class start; a check-in
    // after the threshold (measured from officialStartTime) must still be late.
    const officialStartTime = new Date("2026-05-20T12:10:00+08:00")
    const attendedAt = new Date("2026-05-20T12:35:00+08:00")

    expect(attendanceStatus(attendedAt, officialStartTime, 20)).toBe("late")
  })
})
