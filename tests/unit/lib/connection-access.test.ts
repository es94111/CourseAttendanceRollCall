import { describe, expect, it } from "vitest"
import { ipRuleMatches, normalizeConnectionAccessRule } from "@/lib/connection-access"

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
    expect(
      normalizeConnectionAccessRule({ action: "block", targetType: "ip", value: "203.0.113.10" })
    ).toMatchObject({
      value: "203.0.113.10"
    })
    expect(
      normalizeConnectionAccessRule({ action: "block", targetType: "ip", value: "2001:db8::1" })
    ).toMatchObject({
      value: "2001:db8::1"
    })
  })

  it("accepts IPv4 CIDR rules", () => {
    expect(
      normalizeConnectionAccessRule({ action: "block", targetType: "ip", value: "173.245.48.0/20" })
    ).toMatchObject({
      value: "173.245.48.0/20"
    })
    expect(
      normalizeConnectionAccessRule({ action: "block", targetType: "ip", value: "103.21.244.0/22" })
    ).toMatchObject({
      value: "103.21.244.0/22"
    })
    expect(
      normalizeConnectionAccessRule({ action: "block", targetType: "ip", value: "103.22.200.0/22" })
    ).toMatchObject({
      value: "103.22.200.0/22"
    })
    expect(
      normalizeConnectionAccessRule({ action: "block", targetType: "ip", value: "103.31.4.0/22" })
    ).toMatchObject({
      value: "103.31.4.0/22"
    })
  })

  it("matches IPv4 CIDR ranges", () => {
    expect(ipRuleMatches("173.245.48.0/20", "173.245.48.1")).toBe(true)
    expect(ipRuleMatches("173.245.48.0/20", "173.245.63.255")).toBe(true)
    expect(ipRuleMatches("173.245.48.0/20", "173.245.64.0")).toBe(false)
    expect(ipRuleMatches("103.21.244.0/22", "103.21.247.255")).toBe(true)
    expect(ipRuleMatches("103.21.244.0/22", "103.21.248.0")).toBe(false)
  })

  it("rejects invalid country and IP values", () => {
    expect(() =>
      normalizeConnectionAccessRule({ action: "allow", targetType: "country", value: "Taiwan" })
    ).toThrow()
    expect(() =>
      normalizeConnectionAccessRule({ action: "allow", targetType: "ip", value: "not-an-ip" })
    ).toThrow()
    expect(() =>
      normalizeConnectionAccessRule({ action: "allow", targetType: "ip", value: "173.245.48.0/33" })
    ).toThrow()
  })

  it("normalizes ASN rules", () => {
    expect(
      normalizeConnectionAccessRule({ action: "block", targetType: "asn", value: "as15169" })
    ).toMatchObject({ value: "AS15169" })
    expect(
      normalizeConnectionAccessRule({ action: "allow", targetType: "asn", value: " 13335 " })
    ).toMatchObject({ value: "AS13335" })
  })

  it("rejects invalid ASN values", () => {
    expect(() =>
      normalizeConnectionAccessRule({ action: "block", targetType: "asn", value: "Google" })
    ).toThrow()
    expect(() =>
      normalizeConnectionAccessRule({ action: "block", targetType: "asn", value: "AS" })
    ).toThrow()
  })
})
