import { afterEach, describe, expect, it, vi } from "vitest"
import { lookupIpinfo, normalizeAsn, parseIpinfoLiteResponse } from "@/lib/ipinfo"

describe("parseIpinfoLiteResponse", () => {
  it("extracts country and ASN from IPinfo Lite", () => {
    expect(
      parseIpinfoLiteResponse({
        country_code: "us",
        country: "United States",
        asn: "AS15169",
        as_name: "Google LLC"
      })
    ).toEqual({
      ipCountry: "US",
      ipCountryName: "United States",
      ipAsn: "AS15169",
      ipAsnName: "Google LLC"
    })
  })

  it("returns nulls when fields are missing", () => {
    expect(parseIpinfoLiteResponse({})).toEqual({
      ipCountry: null,
      ipCountryName: null,
      ipAsn: null,
      ipAsnName: null
    })
  })
})

describe("normalizeAsn", () => {
  it("accepts both AS-prefixed and numeric input", () => {
    expect(normalizeAsn("AS15169")).toBe("AS15169")
    expect(normalizeAsn("as15169")).toBe("AS15169")
    expect(normalizeAsn(" 15169 ")).toBe("AS15169")
  })

  it("rejects malformed values", () => {
    expect(normalizeAsn("")).toBeNull()
    expect(normalizeAsn("AS")).toBeNull()
    expect(normalizeAsn("ASabc")).toBeNull()
    expect(normalizeAsn("12.3")).toBeNull()
  })
})

describe("lookupIpinfo", () => {
  const originalToken = process.env.IPINFO_TOKEN

  afterEach(() => {
    process.env.IPINFO_TOKEN = originalToken
    vi.unstubAllGlobals()
  })

  it("uses the IPinfo Lite endpoint with bearer token authentication", async () => {
    process.env.IPINFO_TOKEN = "test-token"
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ country_code: "jp", country: "Japan", asn: "AS2516", as_name: "KDDI" })
    }))
    vi.stubGlobal("fetch", fetchMock)

    await expect(lookupIpinfo("203.0.113.10")).resolves.toEqual({
      ipCountry: "JP",
      ipCountryName: "Japan",
      ipAsn: "AS2516",
      ipAsnName: "KDDI"
    })
    expect(fetchMock).toHaveBeenCalledWith("https://api.ipinfo.io/lite/203.0.113.10", {
      headers: { Authorization: "Bearer test-token" },
      cache: "no-store"
    })
  })

  it("does not call IPinfo when token is missing", async () => {
    delete process.env.IPINFO_TOKEN
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)

    await expect(lookupIpinfo("203.0.113.10")).resolves.toEqual({
      ipCountry: null,
      ipCountryName: null,
      ipAsn: null,
      ipAsnName: null
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
