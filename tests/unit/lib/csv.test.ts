import { describe, expect, it } from "vitest"
import { attendanceRowsToCsv } from "@/lib/csv"

describe("attendanceRowsToCsv", () => {
  it("maps attendance rows and formats timestamps in UTC+8", () => {
    const csv = attendanceRowsToCsv([
      {
        status: "on_time",
        attendedAt: new Date("2026-05-19T00:00:00.000Z"),
        ipAddress: "127.0.0.1",
        ipCountry: "TW",
        ipCountryName: "Taiwan",
        userAgent: "Vitest",
        student: { name: "王小明", studentCode: "B11234567" },
        session: { createdAt: new Date("2026-05-18T16:00:00.000Z") }
      }
    ])

    expect(csv).toContain("學生姓名,學號,課次日期,點名狀態,點名時間,IP 位址,IP 國家,裝置資訊")
    expect(csv).toContain('127.0.0.1,Taiwan (TW),Vitest')
    expect(csv).toContain("2026-05-19T08:00:00+08:00")
  })
})
