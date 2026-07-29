import { afterEach, describe, expect, it, vi } from "vitest"
import {
  assertMultipartRequest,
  hasTrustedRequestOrigin,
  readBoundedJsonBody
} from "@/lib/request-security"

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("request origin validation", () => {
  it("accepts the configured same origin", () => {
    vi.stubEnv("NEXTAUTH_URL", "https://attendance.example.edu")
    const headers = new Headers({
      origin: "https://attendance.example.edu",
      "sec-fetch-site": "same-origin"
    })

    expect(hasTrustedRequestOrigin(headers)).toBe(true)
  })

  it("rejects a same-site sibling origin", () => {
    vi.stubEnv("NEXTAUTH_URL", "https://attendance.example.edu")
    const headers = new Headers({
      origin: "https://student-pages.example.edu",
      "sec-fetch-site": "same-site"
    })

    expect(hasTrustedRequestOrigin(headers)).toBe(false)
  })

  it("rejects cross-site Fetch Metadata even without Origin", () => {
    const headers = new Headers({ "sec-fetch-site": "cross-site" })

    expect(hasTrustedRequestOrigin(headers)).toBe(false)
  })

  it("allows non-browser callers without provenance headers", () => {
    expect(hasTrustedRequestOrigin(new Headers())).toBe(true)
  })
})

describe("bounded request bodies", () => {
  it("parses JSON within the byte limit", async () => {
    const request = new Request("https://attendance.example.edu/api/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ok: true })
    })

    await expect(readBoundedJsonBody(request, 64)).resolves.toEqual({ ok: true })
  })

  it("rejects streamed JSON that exceeds the byte limit", async () => {
    const request = new Request("https://attendance.example.edu/api/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ value: "x".repeat(128) })
    })

    await expect(readBoundedJsonBody(request, 32)).rejects.toMatchObject({ status: 413 })
  })

  it("rejects a non-JSON media type", async () => {
    const request = new Request("https://attendance.example.edu/api/test", {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: "{}"
    })

    await expect(readBoundedJsonBody(request)).rejects.toMatchObject({ status: 415 })
  })

  it("requires a bounded multipart upload", () => {
    const request = new Request("https://attendance.example.edu/api/students/import", {
      method: "POST",
      headers: {
        "content-type": "multipart/form-data; boundary=test",
        "content-length": "2048"
      },
      body: "--test--"
    })

    expect(() => assertMultipartRequest(request, 1024)).toThrow(
      expect.objectContaining({ status: 413 })
    )
  })
})
