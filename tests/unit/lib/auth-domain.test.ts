import { describe, expect, it } from "vitest"
import {
  extractEmailDomain,
  isEmailDomainAllowed,
  parseAllowedEmailDomains
} from "@/lib/auth-domain"

describe("parseAllowedEmailDomains", () => {
  it("splits, trims, lowercases and drops leading @", () => {
    expect(parseAllowedEmailDomains(" School.EDU, @Example.com , ")).toEqual([
      "school.edu",
      "example.com"
    ])
  })

  it("returns empty array when unset", () => {
    expect(parseAllowedEmailDomains(undefined)).toEqual([])
    expect(parseAllowedEmailDomains(null)).toEqual([])
    expect(parseAllowedEmailDomains("")).toEqual([])
  })
})

describe("extractEmailDomain", () => {
  it("returns the lowercase domain", () => {
    expect(extractEmailDomain("User@School.EDU")).toBe("school.edu")
  })

  it("returns null for invalid input", () => {
    expect(extractEmailDomain(null)).toBeNull()
    expect(extractEmailDomain("noatsign")).toBeNull()
    expect(extractEmailDomain("trailing@")).toBeNull()
  })
})

describe("isEmailDomainAllowed", () => {
  it("allows everything when no restriction is configured", () => {
    expect(isEmailDomainAllowed("anyone@anywhere.com", [])).toBe(true)
  })

  it("accepts emails whose domain matches", () => {
    expect(isEmailDomainAllowed("user@school.edu", ["school.edu"])).toBe(true)
    expect(isEmailDomainAllowed("USER@School.EDU", ["school.edu", "example.com"])).toBe(true)
  })

  it("rejects emails outside the allow list", () => {
    expect(isEmailDomainAllowed("user@other.com", ["school.edu"])).toBe(false)
    expect(isEmailDomainAllowed(null, ["school.edu"])).toBe(false)
  })
})
