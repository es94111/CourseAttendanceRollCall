import { afterEach, describe, expect, it, vi } from "vitest"
import { lookupIpinfoCountry, parseIpinfoLiteResponse } from "@/lib/ipinfo"

describe("parseIpinfoLiteResponse", () => {
  it("extracts country code and country name from IPinfo Lite", () => {
    expect(parseIpinfoLiteResponse({ country_code: "us", country: "United States" })).toEqual({
      ipCountry: "US",
      ipCountryName: "United States"
    })
  })
})

describe("lookupIpinfoCountry", () => {
  const originalToken = process.env.IPINFO_TOKEN

  afterEach(() => {
    process.env.IPINFO_TOKEN = originalToken
    vi.unstubAllGlobals()
  })

  it("uses the IPinfo Lite endpoint with bearer token authentication", async () => {
    process.env.IPINFO_TOKEN = "test-token"
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ country_code: "jp", country: "Japan" })
    }))
    vi.stubGlobal("fetch", fetchMock)

    await expect(lookupIpinfoCountry("203.0.113.10")).resolves.toEqual({
      ipCountry: "JP",
      ipCountryName: "Japan"
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

    await expect(lookupIpinfoCountry("203.0.113.10")).resolves.toEqual({
      ipCountry: null,
      ipCountryName: null
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
