import { describe, expect, it } from "vitest"
import { calculateStats } from "@/lib/attendance-stats"

describe("calculateStats", () => {
  it("counts statuses and excludes voided sessions from the denominator", () => {
    const stats = calculateStats(
      [
        { id: "s1", status: "closed" },
        { id: "s2", status: "closed" },
        { id: "s3", status: "voided" }
      ],
      [
        { sessionId: "s1", studentId: "stu1", status: "on_time" },
        { sessionId: "s2", studentId: "stu1", status: "leave" },
        { sessionId: "s3", studentId: "stu1", status: "late" }
      ]
    )

    expect(stats.get("stu1")).toMatchObject({
      onTimeCount: 1,
      lateCount: 0,
      leaveCount: 1,
      absentCount: 0,
      attendanceRate: 50
    })
  })
})
