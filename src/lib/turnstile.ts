import { logger } from "@/lib/logger"

const SITE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"

export interface TurnstileVerifyResult {
  success: boolean
  errorCodes?: string[]
}

function getTurnstileConfig() {
  const siteKey = process.env.TURNSTILE_SITE_KEY?.trim() || null
  const secretKey = process.env.TURNSTILE_SECRET_KEY?.trim() || null
  if (Boolean(siteKey) !== Boolean(secretKey)) {
    throw new Error("TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY must be configured together")
  }
  return { siteKey, secretKey }
}

export function isTurnstileEnabled(): boolean {
  const { siteKey, secretKey } = getTurnstileConfig()
  return Boolean(siteKey && secretKey)
}

export function getTurnstileSiteKey(): string | null {
  return getTurnstileConfig().siteKey
}

export async function verifyTurnstileToken(
  token: string | null | undefined,
  remoteIp?: string | null
): Promise<TurnstileVerifyResult> {
  const { secretKey: secret } = getTurnstileConfig()
  if (!secret) {
    return { success: true }
  }
  if (!token) {
    return { success: false, errorCodes: ["missing-input-response"] }
  }

  const body = new URLSearchParams()
  body.append("secret", secret)
  body.append("response", token)
  if (remoteIp) body.append("remoteip", remoteIp)

  try {
    const response = await fetch(SITE_VERIFY_URL, {
      method: "POST",
      body,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      cache: "no-store"
    })
    if (!response.ok) {
      logger.warn("turnstile.siteverify_http_error", { status: response.status })
      return { success: false, errorCodes: [`http-${response.status}`] }
    }
    const json = (await response.json()) as { success: boolean; "error-codes"?: string[] }
    if (!json.success) {
      logger.info("turnstile.verification_failed", { errorCodes: json["error-codes"] })
    }
    return { success: json.success, errorCodes: json["error-codes"] }
  } catch (error) {
    logger.error("turnstile.siteverify_exception", {
      error: error instanceof Error ? error.message : String(error)
    })
    return { success: false, errorCodes: ["network-error"] }
  }
}
