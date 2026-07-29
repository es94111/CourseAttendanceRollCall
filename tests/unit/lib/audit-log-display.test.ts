import { beforeEach, describe, expect, it, vi } from "vitest"

const prismaMock = vi.hoisted(() => ({
  attendanceSession: {
    findMany: vi.fn()
  },
  course: {
    findMany: vi.fn()
  },
  student: {
    findMany: vi.fn()
  },
  user: {
    findMany: vi.fn()
  }
}))

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))

import { serializeAuditLogs } from "@/lib/audit-log-display"

describe("serializeAuditLogs", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("enriches existing manual attendance logs from the stored new value", async () => {
    prismaMock.attendanceSession.findMany
      .mockResolvedValueOnce([
        { id: "session-2", courseId: "course-1", createdAt: new Date("2026-07-29T12:00:00Z") }
      ])
      .mockResolvedValueOnce([
        { id: "session-1", courseId: "course-1" },
        { id: "session-2", courseId: "course-1" }
      ])
    prismaMock.course.findMany.mockResolvedValue([{ id: "course-1", name: "資料結構" }])
    prismaMock.student.findMany.mockResolvedValue([
      { id: "student-1", name: "王小明", studentCode: "112000001" }
    ])
    prismaMock.user.findMany.mockResolvedValue([])

    const [result] = await serializeAuditLogs([
      {
        id: "audit-1",
        eventType: "manual_attendance_override",
        actorEmail: "admin@example.edu",
        target: { attendanceRecordId: "record-1" },
        oldValue: null,
        newValue: {
          id: "record-1",
          sessionId: "session-2",
          studentId: "student-1",
          status: "leave"
        },
        reason: "點名誤判",
        createdAt: new Date("2026-07-29T12:17:37Z")
      }
    ])

    expect(result.target).toEqual({
      attendanceRecordId: "record-1",
      sessionId: "session-2",
      studentId: "student-1",
      courseName: "資料結構",
      sessionLabel: "第 2 次點名",
      studentDisplay: "王小明（學號 112000001）"
    })
  })
})
