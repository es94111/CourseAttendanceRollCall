import { describe, expect, it } from "vitest"
import { formatIpLocation, getClientIpMetadata } from "@/lib/request-ip"

describe("getClientIpMetadata", () => {
  it("prefers Cloudflare visitor headers over proxy forwarding chains", () => {
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

  it("falls back to the first forwarded IP when Cloudflare IP is unavailable", () => {
    const headers = new Headers({
      "x-forwarded-for": "198.51.100.8, 172.70.1.2"
    })

    expect(getClientIpMetadata(headers)).toEqual({
      ipAddress: "198.51.100.8",
      ipCountry: null
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
