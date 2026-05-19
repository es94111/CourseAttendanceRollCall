import { describe, expect, it, vi } from "vitest"
import { generateToken, verifyToken } from "@/lib/hmac"

describe("HMAC QR token", () => {
  it("generates a base64url token with signed session slot payload", () => {
    vi.setSystemTime(new Date("2026-05-19T00:00:00.000Z"))
    const token = generateToken("session_1")
    const decoded = Buffer.from(token, "base64url").toString("utf8")

    expect(decoded).toMatch(/^session_1:\d+\.[a-f0-9]{64}$/)
  })

  it("verifies a valid token", () => {
    vi.setSystemTime(new Date("2026-05-19T00:00:00.000Z"))
    const token = generateToken("session_1")

    expect(verifyToken(token, 60)).toMatchObject({ valid: true, sessionId: "session_1" })
  })

  it("rejects an expired token", () => {
    vi.setSystemTime(new Date("2026-05-19T00:00:00.000Z"))
    const token = generateToken("session_1")
    vi.setSystemTime(new Date("2026-05-19T00:02:00.000Z"))

    expect(verifyToken(token, 30).valid).toBe(false)
  })

  it("rejects a tampered token", () => {
    vi.setSystemTime(new Date("2026-05-19T00:00:00.000Z"))
    const token = generateToken("session_1")
    const decoded = Buffer.from(token, "base64url").toString("utf8").replace("session_1", "session_2")
    const tampered = Buffer.from(decoded, "utf8").toString("base64url")

    expect(verifyToken(tampered, 60).valid).toBe(false)
  })

  it("accepts the grace period boundary", () => {
    vi.setSystemTime(new Date("2026-05-19T00:00:00.000Z"))
    const token = generateToken("session_1")
    vi.setSystemTime(new Date("2026-05-19T00:00:45.000Z"))

    expect(verifyToken(token, 30).valid).toBe(true)
  })
})
