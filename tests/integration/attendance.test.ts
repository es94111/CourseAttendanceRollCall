import { beforeEach, describe, expect, it, vi } from "vitest"
import { POST } from "@/app/api/attendance/route"
import { generateToken } from "@/lib/hmac"

// Route-level integration tests for the check-in critical path.
// The Prisma client and external integrations are mocked at the module
// boundary; the route handler, HMAC verification, expiry check, validation
// schemas and late-judgment domain rule all run for real.

const prismaMock = vi.hoisted(() => ({
  attendanceSession: {
    findUnique: vi.fn(),
    update: vi.fn()
  },
  student: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    updateMany: vi.fn()
  },
  courseEnrollment: {
    findUnique: vi.fn()
  },
  attendanceRecord: {
    findUnique: vi.fn(),
    create: vi.fn(),
    count: vi.fn()
  },
  systemSetting: {
    findUnique: vi.fn()
  }
}))

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(async () => ({
    user: { id: "user-1", email: "ming@school.edu", name: "王小明", role: "student" }
  }))
}))
// requireUser() reads request-scoped headers via next/headers, which only
// exists inside a real Next.js request scope; the route also validates the
// same provenance rules again on the passed Request, so stub the guard to the
// authenticated user and let the rest of api.ts (zod parsing, error helpers)
// run unmocked.
vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers({ origin: "http://localhost:3000" }))
}))
vi.mock("@/lib/connection-access", () => ({
  checkConnectionAccess: vi.fn(async () => ({ allowed: true, reason: null, rule: null })),
  evaluateConnectionAccess: vi.fn(async () => ({ allowed: true, reason: null, rule: null }))
}))
vi.mock("@/lib/ipinfo", () => ({
  lookupIpinfo: vi.fn(async () => ({
    ipCountry: null,
    ipCountryName: null,
    ipAsn: null,
    ipAsnName: null
  }))
}))
vi.mock("@/lib/audit", () => ({ writeAuditLog: vi.fn(async () => ({})) }))

const SESSION_ID = "session-1"
const SESSION_BASE = {
  id: SESSION_ID,
  status: "active",
  autoExpireMinutes: null,
  qrCodeValiditySeconds: 15,
  gracePeriodSeconds: 60
}

const STUDENT = {
  id: "student-1",
  studentCode: "A123456",
  name: "王小明",
  googleEmail: "ming@school.edu",
  userId: "user-1"
}

function minutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60_000)
}

function makeSession(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    ...SESSION_BASE,
    createdAt: minutesAgo(40),
    officialStartTime: minutesAgo(30),
    course: { id: "course-1", name: "測試課程", lateThresholdMinutes: 20, status: "active" },
    ...overrides
  }
}

function makeRequest(token: string, sessionId = SESSION_ID) {
  return new Request("http://localhost:3000/api/attendance", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "http://localhost:3000",
      "sec-fetch-site": "same-origin"
    },
    body: JSON.stringify({ token, sessionId })
  })
}

function stubHappyPath(session = makeSession()) {
  prismaMock.attendanceSession.findUnique.mockResolvedValue(session)
  prismaMock.student.findFirst.mockResolvedValue(STUDENT)
  prismaMock.courseEnrollment.findUnique.mockResolvedValue({ id: "enroll-1" })
  prismaMock.systemSetting.findUnique.mockResolvedValue(null)
}

// Next.js typed routes widen route handlers to `Response | void`, so awaiting
// POST yields `Response | undefined`. Every case here must return a response,
// so assert at the boundary once instead of narrowing at every call site.
async function callPost(request: Request) {
  const response = await POST(request)
  expect(response).toBeDefined()
  return response as Response
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("POST /api/attendance — late judgment baseline (F-1 / FR-015)", () => {
  it("marks on_time when the admin opened the session early and the student checks in before officialStart + threshold", async () => {
    const session = makeSession({
      createdAt: minutesAgo(40),
      officialStartTime: minutesAgo(5),
      course: { id: "course-1", name: "測試課程", lateThresholdMinutes: 10, status: "active" }
    })
    stubHappyPath(session)
    prismaMock.attendanceRecord.findUnique.mockResolvedValue(null)
    prismaMock.attendanceRecord.create.mockResolvedValue({
      id: "rec-1",
      sessionId: SESSION_ID,
      studentId: STUDENT.id,
      status: "on_time",
      attendedAt: new Date()
    })

    // The buggy createdAt baseline (40 min ago + 10) would judge late; the
    // correct officialStartTime baseline (5 min ago + 10) judges on_time.
    const response = await callPost(makeRequest(generateToken(SESSION_ID)))

    expect(response.status).toBe(200)
    expect(prismaMock.attendanceRecord.create).toHaveBeenCalledTimes(1)
    expect(prismaMock.attendanceRecord.create.mock.calls[0][0].data.status).toBe("on_time")
  })

  it("marks late when the check-in exceeds officialStartTime + threshold even though the session opened late", async () => {
    // Opened only 10 min ago (buggy createdAt baseline would say on_time),
    // official start 35 min ago, threshold 20 → late.
    const session = makeSession({
      createdAt: minutesAgo(10),
      officialStartTime: minutesAgo(35)
    })
    stubHappyPath(session)
    prismaMock.attendanceRecord.findUnique.mockResolvedValue(null)
    prismaMock.attendanceRecord.create.mockResolvedValue({
      id: "rec-1",
      sessionId: SESSION_ID,
      studentId: STUDENT.id,
      status: "late",
      attendedAt: new Date()
    })

    const response = await callPost(makeRequest(generateToken(SESSION_ID)))

    expect(response.status).toBe(200)
    expect(prismaMock.attendanceRecord.create.mock.calls[0][0].data.status).toBe("late")
  })
})

describe("POST /api/attendance — duplicate semantics (FR-013)", () => {
  it("answers an already-recorded check-in with the duplicate wording instead of an error", async () => {
    stubHappyPath()
    prismaMock.attendanceRecord.findUnique.mockResolvedValue({
      id: "rec-1",
      sessionId: SESSION_ID,
      studentId: STUDENT.id,
      status: "on_time",
      attendedAt: minutesAgo(5)
    })

    const response = await callPost(makeRequest(generateToken(SESSION_ID)))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.message).toBe("已完成點名")
    expect(body.duplicate).toBe(true)
    expect(prismaMock.attendanceRecord.create).not.toHaveBeenCalled()
  })

  it("converts a concurrent P2002 unique-constraint hit into the duplicate wording instead of a 500 (F-3)", async () => {
    stubHappyPath()
    // First findUnique (pre-check) sees nothing; the create races into the DB
    // unique constraint; the catch path re-reads the winning record.
    prismaMock.attendanceRecord.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({
      id: "rec-winner",
      sessionId: SESSION_ID,
      studentId: STUDENT.id,
      status: "on_time",
      attendedAt: new Date(),
      session: { course: { name: "測試課程" } }
    })
    prismaMock.attendanceRecord.create.mockRejectedValue(
      Object.assign(new Error("Unique constraint failed"), { code: "P2002" })
    )

    const response = await callPost(makeRequest(generateToken(SESSION_ID)))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.message).toBe("已完成點名")
    expect(body.duplicate).toBe(true)
  })
})

describe("POST /api/attendance — rejection paths", () => {
  it("rejects a tampered token", async () => {
    stubHappyPath()
    // Flip one character inside the payload (base64url decoders silently drop
    // invalid trailing characters, so appending would decode to the same bytes).
    const token = generateToken(SESSION_ID)
    const tampered = `${token.slice(0, 20)}${token[20] === "A" ? "B" : "A"}${token.slice(21)}`
    const response = await callPost(makeRequest(tampered))

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toContain("Token")
  })

  it("rejects a valid token bound to a different session", async () => {
    stubHappyPath()
    const response = await callPost(makeRequest(generateToken("other-session")))

    expect(response.status).toBe(400)
  })

  it("rejects check-ins when the session is no longer active", async () => {
    stubHappyPath(makeSession({ status: "closed" }))
    const response = await callPost(makeRequest(generateToken(SESSION_ID)))

    expect(response.status).toBe(403)
    const body = await response.json()
    expect(body.error).toContain("Session 已關閉")
  })

  it("rejects a student not enrolled in the course", async () => {
    stubHappyPath()
    prismaMock.attendanceRecord.findUnique.mockResolvedValue(null)
    prismaMock.courseEnrollment.findUnique.mockResolvedValue(null)

    const response = await callPost(makeRequest(generateToken(SESSION_ID)))

    expect(response.status).toBe(404)
    const body = await response.json()
    expect(body.error).toBe("學生未選修此課程")
  })
})
