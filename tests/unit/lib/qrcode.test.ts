import { describe, expect, it, vi } from "vitest"
import { buildCheckinUrl } from "@/lib/qrcode"

describe("buildCheckinUrl", () => {
  it("uses NEXTAUTH_URL as the public QR code origin", () => {
    vi.stubEnv("NEXTAUTH_URL", "https://rollcall.example.edu")
    const request = new Request("http://service-internal:3000/api/sessions/session-1/stream")

    const url = new URL(buildCheckinUrl(request, "session-1", "token-1", 30, 90))

    expect(url.origin).toBe("https://rollcall.example.edu")
    expect(url.pathname).toBe("/checkin")
    expect(url.searchParams.get("sessionId")).toBe("session-1")
    expect(url.searchParams.get("token")).toBe("token-1")
    expect(url.searchParams.get("validitySeconds")).toBe("30")
    expect(url.searchParams.get("gracePeriodSeconds")).toBe("90")
  })

  it("falls back to forwarded proxy headers when no auth URL is configured", () => {
    vi.stubEnv("NEXTAUTH_URL", "")
    vi.stubEnv("AUTH_URL", "")
    const request = new Request("http://service-internal:3000/api/sessions/session-1/stream", {
      headers: {
        "x-forwarded-host": "attendance.example.edu",
        "x-forwarded-proto": "https"
      }
    })

    const url = new URL(buildCheckinUrl(request, "session-1", "token-1", 30, 90))

    expect(url.origin).toBe("https://attendance.example.edu")
  })
})
