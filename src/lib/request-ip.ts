import { isIP } from "node:net"

export type TrustedProxyMode = "cloudflare" | "forwarded" | "none"

function trustedProxyMode(): TrustedProxyMode {
  const raw = process.env.TRUSTED_PROXY_MODE?.trim().toLowerCase()
  if (raw === "cloudflare" || raw === "forwarded" || raw === "none") return raw
  return "cloudflare"
}

function splitHeader(value: string | null): string[] {
  return value?.split(",").map((item) => item.trim()).filter(Boolean) ?? []
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
    if (cfIp) {
      return { ipAddress: cfIp, ipCountry: normalizeCountryCode(headers.get("cf-ipcountry")) }
    }
  }

  const forwarded = rightmostForwarded(headers)
  if (forwarded) {
    return {
      ipAddress: forwarded,
      ipCountry: mode === "cloudflare" ? normalizeCountryCode(headers.get("cf-ipcountry")) : null
    }
  }

  return { ipAddress: null, ipCountry: null }
}

export function formatIpLocation(countryCode: string | null | undefined, countryName?: string | null) {
  if (countryName && countryCode) return `${countryName} (${countryCode})`
  if (countryName) return countryName
  if (!countryCode) return ""
  if (countryCode === "XX") return "未知地區"
  if (countryCode === "T1") return "Tor 網路"
  return countryCode
}
