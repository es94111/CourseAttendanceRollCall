import { describe, expect, it } from "vitest"
import { normalizeConnectionAccessRule } from "@/lib/connection-access"

describe("normalizeConnectionAccessRule", () => {
  it("normalizes country rules to uppercase", () => {
    expect(
      normalizeConnectionAccessRule({
        action: "allow",
        targetType: "country",
        value: "tw",
        enabled: true
      })
    ).toMatchObject({ value: "TW" })
  })

  it("accepts IPv4 and IPv6 rules", () => {
    expect(normalizeConnectionAccessRule({ action: "block", targetType: "ip", value: "203.0.113.10" })).toMatchObject({
      value: "203.0.113.10"
    })
    expect(normalizeConnectionAccessRule({ action: "block", targetType: "ip", value: "2001:db8::1" })).toMatchObject({
      value: "2001:db8::1"
    })
  })

  it("rejects invalid country and IP values", () => {
    expect(() => normalizeConnectionAccessRule({ action: "allow", targetType: "country", value: "Taiwan" })).toThrow()
    expect(() => normalizeConnectionAccessRule({ action: "allow", targetType: "ip", value: "not-an-ip" })).toThrow()
  })
})
