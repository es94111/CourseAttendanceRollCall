import { describe, expect, it } from "vitest"
import {
  type AuditLogRow,
  auditChangeEntries,
  auditTargetEntries,
  formatAuditDescription
} from "@/lib/audit-log-format"

function manualLog(overrides: Partial<AuditLogRow> = {}): AuditLogRow {
  return {
    id: "audit-1",
    eventType: "manual_attendance_override",
    actorEmail: "admin@example.edu",
    target: {
      attendanceRecordId: "record-1",
      courseName: "資料結構",
      sessionLabel: "第 3 次點名",
      studentDisplay: "王小明（學號 112000001）"
    },
    oldValue: null,
    newValue: {
      id: "record-1",
      sessionId: "session-1",
      studentId: "student-1",
      status: "leave",
      isManual: true,
      attendedAt: "2026-07-29T12:17:37.150Z",
      createdAt: "2026-07-29T12:17:37.151Z",
      updatedAt: "2026-07-29T12:17:37.151Z",
      ipAddress: null
    },
    reason: "點名誤判",
    createdAt: "2026-07-29T20:17:37+08:00",
    ...overrides
  }
}

describe("audit log formatting", () => {
  it("describes a manual attendance addition with student, course, session and status", () => {
    expect(formatAuditDescription(manualLog())).toBe(
      "為王小明（學號 112000001）補登「資料結構」第 3 次點名，狀態為「請假」"
    )
  })

  it("describes a manual status override as a before-and-after change", () => {
    expect(
      formatAuditDescription(
        manualLog({
          oldValue: { status: "absent", isManual: false },
          newValue: { status: "late", isManual: true }
        })
      )
    ).toBe("將王小明（學號 112000001）在「資料結構」第 3 次點名的狀態由「缺席」更新為「遲到」")
  })

  it("flags name-match bindings in bind descriptions", () => {
    const bindLog: AuditLogRow = {
      id: "audit-2",
      eventType: "student_email_bind",
      actorEmail: "student@example.edu",
      target: {
        studentId: "student-1",
        studentCode: "112000001",
        studentName: "王小明",
        bindMethod: "name_match"
      },
      oldValue: { googleEmail: null, userId: null },
      newValue: {
        googleEmail: "student@example.edu",
        userId: "user-1",
        bindMethod: "name_match"
      },
      reason: null,
      createdAt: "2026-08-29T10:00:00+08:00"
    }
    expect(formatAuditDescription(bindLog)).toBe(
      "綁定學生「王小明」的 Google Email（以 Google 顯示名稱自動比對）"
    )

    expect(
      formatAuditDescription({
        ...bindLog,
        target: { ...((bindLog.target ?? {}) as object), bindMethod: "email" },
        newValue: { ...((bindLog.newValue ?? {}) as object), bindMethod: "email" }
      })
    ).toBe("綁定學生「王小明」的 Google Email")
  })

  it("shows friendly target context before the technical record identifier", () => {
    expect(auditTargetEntries(manualLog())).toEqual([
      ["課程", "資料結構"],
      ["點名場次", "第 3 次點名"],
      ["學生", "王小明（學號 112000001）"],
      ["點名記錄 ID", "record-1"]
    ])
  })

  it("only keeps meaningful attendance fields and formats their values", () => {
    expect(auditChangeEntries(manualLog())).toEqual([
      {
        key: "status",
        label: "點名狀態",
        oldValue: "尚無紀錄",
        newValue: "請假"
      },
      {
        key: "attendedAt",
        label: "點名時間",
        oldValue: "—",
        newValue: "2026/07/29 20:17:37"
      },
      {
        key: "isManual",
        label: "記錄方式",
        oldValue: "—",
        newValue: "手動補登／調整"
      }
    ])
  })
})
