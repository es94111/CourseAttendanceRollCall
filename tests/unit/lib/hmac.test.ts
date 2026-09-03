import { describe, expect, it, vi } from "vitest"
import { generateToken, verifyToken } from "@/lib/hmac"

describe("HMAC QR token", () => {
  it("generates a base64url token with signed session timestamp payload", () => {
    vi.setSystemTime(new Date("2026-05-19T00:00:00.000Z"))
    const token = generateToken("session_1")
    const decoded = Buffer.from(token, "base64url").toString("utf8")

    expect(decoded).toMatch(/^session_1:\d+:15\.[a-f0-9]{64}$/)
  })

  it("verifies a valid token", () => {
    vi.setSystemTime(new Date("2026-05-19T00:00:00.000Z"))
    const token = generateToken("session_1")

    expect(verifyToken(token, 60)).toMatchObject({
      valid: true,
      sessionId: "session_1",
      issuedAt: new Date("2026-05-19T00:00:00.000Z")
    })
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
    const decoded = Buffer.from(token, "base64url")
      .toString("utf8")
      .replace("session_1", "session_2")
    const tampered = Buffer.from(decoded, "utf8").toString("base64url")

    expect(verifyToken(tampered, 60).valid).toBe(false)
  })

  it("accepts the grace period boundary", () => {
    vi.setSystemTime(new Date("2026-05-19T00:00:00.000Z"))
    const token = generateToken("session_1")
    vi.setSystemTime(new Date("2026-05-19T00:00:45.000Z"))

    expect(verifyToken(token, 30).valid).toBe(true)
  })

  it("uses configurable QR code validity seconds", () => {
    const token = generateToken("session_1", 1_234, 60)

    expect(verifyToken(token, 0, 61_233, 60).valid).toBe(true)
    expect(verifyToken(token, 0, 61_235, 60).valid).toBe(false)
  })

  it("keeps a token valid for the full configured seconds from issue time", () => {
    const token = generateToken("session_1", 9_500, 10)

    expect(verifyToken(token, 0, 19_499, 10).valid).toBe(true)
    expect(verifyToken(token, 0, 19_501, 10).valid).toBe(false)
  })

  it("rejects tokens issued too far in the future", () => {
    const token = generateToken("session_1", 60_000)

    expect(verifyToken(token, 60, 0).valid).toBe(false)
  })

  it("rejects oversized token input before decoding", () => {
    expect(verifyToken("a".repeat(1025), 60).valid).toBe(false)
  })

  it("requires a QR secret of at least 32 bytes", () => {
    vi.stubEnv("QR_SECRET", "too-short")

    expect(() => generateToken("session_1")).toThrow(/at least 32 bytes/)
  })
})
