import { beforeEach, describe, expect, it, vi } from "vitest"

const prismaMock = vi.hoisted(() => ({
  attendanceSession: {
    findMany: vi.fn()
  },
  courseEnrollment: {
    findMany: vi.fn()
  }
}))

const writeAuditLogMock = vi.hoisted(() => vi.fn(async () => ({})))

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(async () => ({
    user: { id: "admin-1", email: "teacher@school.edu", role: "admin" }
  }))
}))
vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers({ origin: "http://localhost:3000" }))
}))
vi.mock("@/lib/connection-access", () => ({
  checkConnectionAccess: vi.fn(async () => ({ allowed: true, reason: null, rule: null }))
}))
vi.mock("@/lib/audit", () => ({ writeAuditLog: writeAuditLogMock }))

import { GET } from "@/app/api/courses/[id]/export/route"

const COURSE_ID = "course-1"
const SESSION_ID = "session-1"

const student1 = { id: "student-1", studentCode: "A001", name: "準時學生" }
const student2 = { id: "student-2", studentCode: "A002", name: "遲到學生" }
const student3 = { id: "student-3", studentCode: "A003", name: "缺席學生" }
const sessionDate = new Date("2026-09-01T01:00:00.000Z")

const session = {
  id: SESSION_ID,
  courseId: COURSE_ID,
  createdAt: sessionDate,
  records: [
    {
      id: "record-1",
      sessionId: SESSION_ID,
      studentId: student1.id,
      status: "on_time",
      attendedAt: new Date("2026-09-01T01:05:00.000Z"),
      ipAddress: "192.0.2.1",
      ipCountry: "TW",
      ipCountryName: "Taiwan",
      userAgent: "Vitest",
      student: student1
    },
    {
      id: "record-2",
      sessionId: SESSION_ID,
      studentId: student2.id,
      status: "late",
      attendedAt: new Date("2026-09-01T01:30:00.000Z"),
      ipAddress: null,
      ipCountry: null,
      ipCountryName: null,
      userAgent: null,
      student: student2
    }
  ]
}

function routeProps() {
  return { params: Promise.resolve({ id: COURSE_ID }) }
}

async function callGet(request: Request) {
  const response = await GET(request, routeProps())
  expect(response).toBeDefined()
  return response as Response
}

beforeEach(() => {
  vi.clearAllMocks()
  prismaMock.attendanceSession.findMany.mockResolvedValue([session])
  prismaMock.courseEnrollment.findMany.mockResolvedValue([
    { student: student1 },
    { student: student2 },
    { student: student3 }
  ])
})

describe("GET /api/courses/[id]/export", () => {
  it("exports every enrolled student when no status filter is set", async () => {
    const response = await callGet(
      new Request(`http://localhost:3000/api/courses/${COURSE_ID}/export?confirmed=true`)
    )

    expect(response.status).toBe(200)
    const csv = await response.text()
    const lines = csv.trimEnd().split("\n")

    expect(lines).toHaveLength(4)
    expect(csv).toContain("準時學生")
    expect(csv).toContain("遲到學生")
    expect(csv).toContain("缺席學生")
    expect(csv).toContain("late")
    expect(csv).toContain("absent")
    expect(writeAuditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "export_attendance",
        target: expect.objectContaining({ total: 3 })
      })
    )
  })

  it("requires the PII export confirmation", async () => {
    const response = await callGet(
      new Request(`http://localhost:3000/api/courses/${COURSE_ID}/export`)
    )

    expect(response.status).toBe(400)
    expect(prismaMock.attendanceSession.findMany).not.toHaveBeenCalled()
    expect(prismaMock.courseEnrollment.findMany).not.toHaveBeenCalled()
  })
})
