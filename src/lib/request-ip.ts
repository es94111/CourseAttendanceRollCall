import { isIP } from "node:net"

export type TrustedProxyMode = "cloudflare" | "forwarded" | "none"

function trustedProxyMode(): TrustedProxyMode {
  const raw = process.env.TRUSTED_PROXY_MODE?.trim().toLowerCase()
  if (raw === "cloudflare" || raw === "forwarded" || raw === "none") return raw
  return "cloudflare"
}

function splitHeader(value: string | null): string[] {
  return (
    value
      ?.split(",")
      .map((item) => item.trim())
      .filter(Boolean) ?? []
  )
}

function validIp(value: string | null | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim()
  return trimmed && isIP(trimmed) !== 0 ? trimmed : null
}

function normalizeCountryCode(value: string | null) {
  const country = splitHeader(value)[0]?.toUpperCase() ?? null
  return country && /^[A-Z0-9]{2}$/.test(country) ? country : null
}

function rightmostForwarded(headers: Headers): string | null {
  const parts = splitHeader(headers.get("x-forwarded-for"))
  for (let i = parts.length - 1; i >= 0; i -= 1) {
    const ip = validIp(parts[i])
    if (ip) return ip
  }
  return null
}

export function getClientIpMetadata(headers: Headers) {
  const mode = trustedProxyMode()
  if (mode === "none") return { ipAddress: null, ipCountry: null }

  if (mode === "cloudflare") {
    const cfIp = validIp(headers.get("cf-connecting-ip"))
    // Only Cloudflare's own header is trustworthy in this mode. Falling back to
    // x-forwarded-for would let a client that bypasses Cloudflare (direct hit on
    // the origin) forge its IP and evade IP/country block rules and the
    // per-IP check-in share limit.
    if (!cfIp) return { ipAddress: null, ipCountry: null }
    return { ipAddress: cfIp, ipCountry: normalizeCountryCode(headers.get("cf-ipcountry")) }
  }

  const forwarded = rightmostForwarded(headers)
  if (forwarded) {
    return { ipAddress: forwarded, ipCountry: null }
  }

  return { ipAddress: null, ipCountry: null }
}

export { formatIpLocation } from "@/lib/ip-format"
