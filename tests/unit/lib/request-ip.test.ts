import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { formatIpLocation, getClientIpMetadata } from "@/lib/request-ip"

describe("getClientIpMetadata", () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe("cloudflare mode (default)", () => {
    it("trusts Cloudflare visitor headers when present", () => {
      const headers = new Headers({
        "cf-connecting-ip": "203.0.113.10",
        "cf-ipcountry": "tw",
        "x-forwarded-for": "249.34.226.81, 172.70.1.2"
      })

      expect(getClientIpMetadata(headers)).toEqual({
        ipAddress: "203.0.113.10",
        ipCountry: "TW"
      })
    })

    it("ignores non-IP values in cf-connecting-ip to defuse spoofing", () => {
      const headers = new Headers({
        "cf-connecting-ip": "not-an-ip",
        "x-forwarded-for": "198.51.100.8, 172.70.1.2"
      })

      // No trustworthy source: the forged x-forwarded-for must not be used.
      expect(getClientIpMetadata(headers)).toEqual({
        ipAddress: null,
        ipCountry: null
      })
    })

    it("does not fall back to x-forwarded-for when the CF header is missing", () => {
      const headers = new Headers({
        "x-forwarded-for": "198.51.100.8, 172.70.1.2"
      })

      // A direct hit on the origin bypasses Cloudflare; x-forwarded-for is
      // attacker-controllable there, so treating it as the client IP would
      // let requests forge their way past IP/country block rules.
      expect(getClientIpMetadata(headers)).toEqual({
        ipAddress: null,
        ipCountry: null
      })
    })
  })

  describe("forwarded mode", () => {
    it("ignores Cloudflare headers and only takes rightmost x-forwarded-for", () => {
      vi.stubEnv("TRUSTED_PROXY_MODE", "forwarded")
      const headers = new Headers({
        "cf-connecting-ip": "203.0.113.10",
        "cf-ipcountry": "TW",
        "x-forwarded-for": "198.51.100.8, 192.0.2.5"
      })

      expect(getClientIpMetadata(headers)).toEqual({
        ipAddress: "192.0.2.5",
        ipCountry: null
      })
    })

    it("returns nulls when no valid forwarded IP exists", () => {
      vi.stubEnv("TRUSTED_PROXY_MODE", "forwarded")
      const headers = new Headers({ "cf-connecting-ip": "203.0.113.10" })
      expect(getClientIpMetadata(headers)).toEqual({ ipAddress: null, ipCountry: null })
    })
  })

  describe("none mode", () => {
    it("returns nulls regardless of forwarded headers", () => {
      vi.stubEnv("TRUSTED_PROXY_MODE", "none")
      const headers = new Headers({
        "cf-connecting-ip": "203.0.113.10",
        "x-forwarded-for": "198.51.100.8"
      })
      expect(getClientIpMetadata(headers)).toEqual({ ipAddress: null, ipCountry: null })
    })
  })
})

describe("formatIpLocation", () => {
  it("formats Cloudflare special country codes", () => {
    expect(formatIpLocation("XX")).toBe("未知地區")
    expect(formatIpLocation("T1")).toBe("Tor 網路")
    expect(formatIpLocation("JP", "Japan")).toBe("Japan (JP)")
  })
})
