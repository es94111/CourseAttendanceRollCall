import { afterEach, describe, expect, it, vi } from "vitest"
import {
  getTurnstileSiteKey,
  isTurnstileEnabled,
  verifyTurnstileToken
} from "@/lib/turnstile"

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("Turnstile configuration", () => {
  it("is disabled when both keys are blank", () => {
    vi.stubEnv("TURNSTILE_SITE_KEY", "")
    vi.stubEnv("TURNSTILE_SECRET_KEY", "")

    expect(isTurnstileEnabled()).toBe(false)
    expect(getTurnstileSiteKey()).toBeNull()
  })

  it("fails closed when only one key is configured", () => {
    vi.stubEnv("TURNSTILE_SITE_KEY", "site-key")
    vi.stubEnv("TURNSTILE_SECRET_KEY", "")

    expect(() => isTurnstileEnabled()).toThrow(/configured together/)
  })

  it("rejects a missing response when enabled", async () => {
    vi.stubEnv("TURNSTILE_SITE_KEY", "site-key")
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret-key")

    await expect(verifyTurnstileToken(null)).resolves.toEqual({
      success: false,
      errorCodes: ["missing-input-response"]
    })
  })
})
