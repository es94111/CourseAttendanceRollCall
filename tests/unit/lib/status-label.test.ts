import { describe, expect, it } from "vitest"
import {
  attendanceStatusLabel,
  courseStatusLabel,
  sessionStatusLabel
} from "@/lib/status-label"

describe("status labels", () => {
  it("translates attendance statuses to Traditional Chinese", () => {
    expect(attendanceStatusLabel("on_time")).toBe("準時")
    expect(attendanceStatusLabel("late")).toBe("遲到")
    expect(attendanceStatusLabel("leave")).toBe("請假")
    expect(attendanceStatusLabel("absent")).toBe("缺席")
  })

  it("translates session statuses to Traditional Chinese", () => {
    expect(sessionStatusLabel("active")).toBe("進行中")
    expect(sessionStatusLabel("closed")).toBe("已關閉")
    expect(sessionStatusLabel("expired")).toBe("已逾時")
    expect(sessionStatusLabel("voided")).toBe("已作廢")
  })

  it("translates course statuses to Traditional Chinese", () => {
    expect(courseStatusLabel("active")).toBe("使用中")
    expect(courseStatusLabel("archived")).toBe("已封存")
  })

  it("keeps unknown statuses visible for debugging", () => {
    expect(attendanceStatusLabel("custom")).toBe("custom")
    expect(attendanceStatusLabel(null)).toBe("-")
  })
})
