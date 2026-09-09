import { beforeEach, describe, expect, it, vi } from "vitest"

const getCourseStatistics = vi.hoisted(() => vi.fn())

vi.mock("@/lib/api", () => ({
  requireAdmin: vi.fn(async () => ({
    user: { id: "admin-1", email: "admin@example.edu", role: "admin" }
  }))
}))
vi.mock("@/lib/course-statistics", () => ({ getCourseStatistics }))

import { GET } from "@/app/api/courses/[id]/statistics/stream/route"

const routeParams = (id = "course-1") => ({ params: Promise.resolve({ id }) })

beforeEach(() => {
  vi.clearAllMocks()
})

describe("GET /api/courses/[id]/statistics/stream", () => {
  it("closes without polling when the course has no active session", async () => {
    getCourseStatistics.mockResolvedValue({
      hasActiveSession: false,
      data: { courseId: "course-1", totalSessions: 1, students: [] }
    })

    const response = await GET(
      new Request("http://localhost:3000/api/courses/course-1/statistics/stream"),
      routeParams()
    )

    expect(response).toBeDefined()
    if (!response) throw new Error("Expected a stream response")
    expect(response.status).toBe(200)
    expect(await response.text()).toContain("event: statistics_stream_closed")
    expect(getCourseStatistics).toHaveBeenCalledTimes(1)
  })

  it("emits a snapshot while a session is active and closes on abort", async () => {
    getCourseStatistics.mockResolvedValue({
      hasActiveSession: true,
      data: { courseId: "course-1", totalSessions: 1, students: [] }
    })
    const abortController = new AbortController()
    const response = await GET(
      new Request("http://localhost:3000/api/courses/course-1/statistics/stream", {
        signal: abortController.signal
      }),
      routeParams()
    )
    expect(response).toBeDefined()
    if (!response) throw new Error("Expected a stream response")
    const reader = response.body?.getReader()
    expect(reader).toBeDefined()

    const firstChunk = await reader?.read()
    const text = new TextDecoder().decode(firstChunk?.value)
    expect(text).toContain("event: statistics_update")
    expect(text).toContain('"courseId":"course-1"')

    abortController.abort()
    await reader?.read()
  })
})
