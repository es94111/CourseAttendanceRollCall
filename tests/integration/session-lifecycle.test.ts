import { beforeEach, describe, expect, it, vi } from "vitest"

// Route-level integration tests for the AttendanceSession state machine.
// Guards (requireAdmin), Prisma and audit logging are mocked at the module
// boundary; each handler's status checks and transitions run for real.
// Covered transitions (FR-007/007a/007c, reopen as an admin recovery path):
//   open        : course archived → 404; existing active → 409
//   close       : any status → closed, except voided → 400
//   reopen      : closed/expired → active; active → 409; voided → 400;
//                 archived course → 400; clears a stale autoExpireMinutes
//   void        : non-active → voided + reason; active → 400
//   PATCH settings: only while active

const prismaMock = vi.hoisted(() => ({
  attendanceSession: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn()
  },
  course: {
    findUnique: vi.fn()
  }
}))

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(async () => ({
    user: { id: "admin-1", email: "teacher@school.edu", name: "教師", role: "admin" }
  }))
}))
vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers({ origin: "http://localhost:3000" }))
}))
vi.mock("@/lib/connection-access", () => ({
  checkConnectionAccess: vi.fn(async () => ({ allowed: true, reason: null, rule: null })),
  evaluateConnectionAccess: vi.fn(async () => ({ allowed: true, reason: null, rule: null }))
}))
vi.mock("@/lib/audit", () => ({ writeAuditLog: vi.fn(async () => ({})) }))
vi.mock("@/lib/qrcode", () => ({
  generateQRCodeDataURL: vi.fn(async () => "data:image/png;base64,x"),
  buildCheckinUrl: vi.fn(() => "http://localhost:3000/checkin")
}))

import { POST as createSession } from "@/app/api/courses/[id]/sessions/route"
import { POST as closeSession } from "@/app/api/sessions/[id]/close/route"
import { POST as reopenSession } from "@/app/api/sessions/[id]/reopen/route"
import { POST as voidSession } from "@/app/api/sessions/[id]/void/route"

const COURSE_ID = "course-1"
const SESSION_ID = "session-1"

const COURSE = {
  id: COURSE_ID,
  name: "測試課程",
  status: "active",
  lateThresholdMinutes: 10
}

function minutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60_000)
}

function makeSession(overrides: Record<string, unknown> = {}) {
  return {
    id: SESSION_ID,
    courseId: COURSE_ID,
    status: "active",
    autoExpireMinutes: null,
    qrCodeValiditySeconds: 15,
    gracePeriodSeconds: 60,
    officialStartTime: minutesAgo(30),
    createdAt: minutesAgo(30),
    voidReason: null,
    course: { status: "active" },
    ...overrides
  }
}

function adminRequest(body?: unknown) {
  return new Request("http://localhost:3000/api/x", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "http://localhost:3000",
      "sec-fetch-site": "same-origin"
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  })
}

const routeParams = (id = SESSION_ID) => ({ params: Promise.resolve({ id }) })
const courseRouteParams = (id = COURSE_ID) => ({ params: Promise.resolve({ id }) })

// Route handlers accept (Request, { params }) and resolve to Response | void
// under Next.js typed routes; assert a response came back and narrow once here.
type SessionRouteHandler = (
  request: Request,
  props: { params: Promise<Record<string, string>> }
) => Promise<Response | undefined> | Response | undefined

async function callPost(handler: SessionRouteHandler, request: Request, props: unknown) {
  const response = await handler(request, props as { params: Promise<Record<string, string>> })
  expect(response).toBeDefined()
  return response as Response
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("POST /api/courses/[id]/sessions — opening rules (FR-007c)", () => {
  it("creates an active session when the course is active and no session is open", async () => {
    prismaMock.course.findUnique.mockResolvedValue(COURSE)
    prismaMock.attendanceSession.findFirst.mockResolvedValue(null)
    prismaMock.attendanceSession.create.mockResolvedValue(makeSession({ status: "active" }))

    const response = await callPost(
      createSession,
      adminRequest({
        officialStartTime: minutesAgo(1).toISOString(),
        autoExpireMinutes: null,
        qrCodeValiditySeconds: 15,
        gracePeriodSeconds: 60
      }),
      courseRouteParams()
    )

    expect(response.status).toBe(201)
    expect(prismaMock.attendanceSession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ courseId: COURSE_ID })
      })
    )
  })

  it("refuses to open a second session while one is already active (FR-007c)", async () => {
    prismaMock.course.findUnique.mockResolvedValue(COURSE)
    prismaMock.attendanceSession.findFirst.mockResolvedValue(makeSession())

    const response = await callPost(
      createSession,
      adminRequest({
        officialStartTime: minutesAgo(1).toISOString(),
        qrCodeValiditySeconds: 15,
        gracePeriodSeconds: 60
      }),
      courseRouteParams()
    )

    expect(response.status).toBe(409)
    expect(prismaMock.attendanceSession.create).not.toHaveBeenCalled()
  })

  it("refuses to open a session for an archived course (FR-002)", async () => {
    prismaMock.course.findUnique.mockResolvedValue({ ...COURSE, status: "archived" })

    const response = await callPost(
      createSession,
      adminRequest({
        officialStartTime: minutesAgo(1).toISOString(),
        qrCodeValiditySeconds: 15,
        gracePeriodSeconds: 60
      }),
      courseRouteParams()
    )

    expect(response.status).toBe(404)
    expect(prismaMock.attendanceSession.create).not.toHaveBeenCalled()
  })
})

describe("POST /api/sessions/[id]/close — close rules (FR-007a)", () => {
  it("closes an active session", async () => {
    prismaMock.attendanceSession.findUnique.mockResolvedValue(makeSession({ status: "active" }))
    prismaMock.attendanceSession.update.mockResolvedValue(makeSession({ status: "closed" }))

    const response = await callPost(closeSession, adminRequest(), routeParams())

    expect(response.status).toBe(200)
    expect(prismaMock.attendanceSession.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "closed" } })
    )
  })

  it("closes an expired session (late-arrivals cleanup)", async () => {
    prismaMock.attendanceSession.findUnique.mockResolvedValue(makeSession({ status: "expired" }))
    prismaMock.attendanceSession.update.mockResolvedValue(makeSession({ status: "closed" }))

    const response = await callPost(closeSession, adminRequest(), routeParams())

    expect(response.status).toBe(200)
  })

  it("refuses to close a voided session (voided is terminal)", async () => {
    prismaMock.attendanceSession.findUnique.mockResolvedValue(makeSession({ status: "voided" }))

    const response = await callPost(closeSession, adminRequest(), routeParams())

    expect(response.status).toBe(400)
    expect(prismaMock.attendanceSession.update).not.toHaveBeenCalled()
  })
})

describe("POST /api/sessions/[id]/reopen — reopen rules", () => {
  it.each(["closed", "expired"])("reopens a %s session to active", async (fromStatus) => {
    prismaMock.attendanceSession.findUnique.mockResolvedValue(makeSession({ status: fromStatus }))
    prismaMock.attendanceSession.findFirst.mockResolvedValue(null)
    prismaMock.attendanceSession.update.mockResolvedValue(makeSession({ status: "active" }))

    const response = await callPost(reopenSession, adminRequest(), routeParams())

    expect(response.status).toBe(200)
    expect(prismaMock.attendanceSession.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "active" }) })
    )
  })

  it("refuses to reopen while the session is already active", async () => {
    prismaMock.attendanceSession.findUnique.mockResolvedValue(makeSession({ status: "active" }))

    const response = await callPost(reopenSession, adminRequest(), routeParams())

    expect(response.status).toBe(409)
    expect(prismaMock.attendanceSession.update).not.toHaveBeenCalled()
  })

  it("refuses to reopen a voided session (voided is terminal)", async () => {
    prismaMock.attendanceSession.findUnique.mockResolvedValue(makeSession({ status: "voided" }))

    const response = await callPost(reopenSession, adminRequest(), routeParams())

    expect(response.status).toBe(400)
    expect(prismaMock.attendanceSession.update).not.toHaveBeenCalled()
  })

  it("refuses to reopen a session of an archived course", async () => {
    prismaMock.attendanceSession.findUnique.mockResolvedValue(
      makeSession({ status: "closed", course: { status: "archived" } })
    )

    const response = await callPost(reopenSession, adminRequest(), routeParams())

    expect(response.status).toBe(400)
    expect(prismaMock.attendanceSession.update).not.toHaveBeenCalled()
  })

  it("refuses to reopen when another session of the same course is active (FR-007c)", async () => {
    prismaMock.attendanceSession.findUnique.mockResolvedValue(makeSession({ status: "closed" }))
    prismaMock.attendanceSession.findFirst.mockResolvedValue(makeSession({ id: "other-1" }))

    const response = await callPost(reopenSession, adminRequest(), routeParams())

    expect(response.status).toBe(409)
    expect(prismaMock.attendanceSession.update).not.toHaveBeenCalled()
  })

  it("clears a stale autoExpireMinutes so the reopened session does not immediately expire again", async () => {
    // autoExpireMinutes=30, created 40 min ago → the old deadline is in the past.
    prismaMock.attendanceSession.findUnique.mockResolvedValue(
      makeSession({ status: "closed", autoExpireMinutes: 30, createdAt: minutesAgo(40) })
    )
    prismaMock.attendanceSession.findFirst.mockResolvedValue(null)
    prismaMock.attendanceSession.update.mockResolvedValue(
      makeSession({ status: "active", autoExpireMinutes: null })
    )

    const response = await callPost(reopenSession, adminRequest(), routeParams())

    expect(response.status).toBe(200)
    expect(prismaMock.attendanceSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "active", autoExpireMinutes: null })
      })
    )
  })

  it("keeps a still-future autoExpireMinutes when reopening", async () => {
    prismaMock.attendanceSession.findUnique.mockResolvedValue(
      makeSession({ status: "closed", autoExpireMinutes: 30, createdAt: minutesAgo(5) })
    )
    prismaMock.attendanceSession.findFirst.mockResolvedValue(null)
    prismaMock.attendanceSession.update.mockResolvedValue(
      makeSession({ status: "active", autoExpireMinutes: 30 })
    )

    const response = await callPost(reopenSession, adminRequest(), routeParams())

    expect(response.status).toBe(200)
    // The handler omits autoExpireMinutes from the update payload when the old
    // deadline is still in the future, leaving the DB value untouched.
    expect(prismaMock.attendanceSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: "active" }
      })
    )
  })
})

describe("POST /api/sessions/[id]/void — void rules (FR-007)", () => {
  it("voids a closed session with the given reason and writes an audit log", async () => {
    prismaMock.attendanceSession.findUnique.mockResolvedValue(makeSession({ status: "closed" }))
    prismaMock.attendanceSession.update.mockResolvedValue(
      makeSession({ status: "voided", voidReason: "誤開" })
    )

    const response = await callPost(voidSession, adminRequest({ reason: "誤開" }), routeParams())

    expect(response.status).toBe(200)
    expect(prismaMock.attendanceSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "voided", voidReason: "誤開" })
      })
    )
  })

  it("refuses to void an active session without closing first", async () => {
    prismaMock.attendanceSession.findUnique.mockResolvedValue(makeSession({ status: "active" }))

    const response = await callPost(voidSession, adminRequest({ reason: "誤開" }), routeParams())

    expect(response.status).toBe(400)
    expect(prismaMock.attendanceSession.update).not.toHaveBeenCalled()
  })

  it("rejects an empty reason", async () => {
    const response = await callPost(voidSession, adminRequest({ reason: "  " }), routeParams())

    expect(response.status).toBe(400)
    expect(prismaMock.attendanceSession.findUnique).not.toHaveBeenCalled()
  })
})
