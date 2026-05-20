import { describe, expect, it } from "vitest"
import { generateToken } from "@/lib/hmac"
import { parseTokenSlot } from "@/lib/token-slot"

describe("parseTokenSlot", () => {
  it("parses session id, slot, and expiry from a valid token payload", () => {
    const token = generateToken("session_1", 30_000)
    expect(parseTokenSlot(token)).toEqual({
      sessionId: "session_1",
      slot: 2,
      expiresAt: new Date(45_000)
    })
  })

  it("uses configurable QR code validity seconds for expiry", () => {
    const token = generateToken("session_1", 120_000, 60)
    expect(parseTokenSlot(token, 60)).toEqual({
      sessionId: "session_1",
      slot: 2,
      expiresAt: new Date(180_000)
    })
  })

  it("returns null for malformed tokens", () => {
    expect(parseTokenSlot("invalid")).toBeNull()
    expect(parseTokenSlot(Buffer.from("abc.def", "utf8").toString("base64url"))).toBeNull()
  })
})
