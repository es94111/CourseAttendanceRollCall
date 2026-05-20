interface IpinfoLiteResponse {
  country_code?: unknown
  country?: unknown
  asn?: unknown
  as_name?: unknown
}

export interface IpinfoLookupResult {
  ipCountry: string | null
  ipCountryName: string | null
  ipAsn: string | null
  ipAsnName: string | null
}

function normalizeCountryCode(value: unknown) {
  if (typeof value !== "string") return null
  const country = value.trim().toUpperCase()
  return /^[A-Z0-9]{2}$/.test(country) ? country : null
}

function normalizeCountryName(value: unknown) {
  if (typeof value !== "string") return null
  const country = value.trim()
  return country ? country : null
}

export function normalizeAsn(value: unknown) {
  if (typeof value !== "string") return null
  const trimmed = value.trim().toUpperCase()
  if (!trimmed) return null
  const withoutPrefix = trimmed.startsWith("AS") ? trimmed.slice(2) : trimmed
  if (!/^\d+$/.test(withoutPrefix)) return null
  return `AS${withoutPrefix}`
}

function normalizeAsnName(value: unknown) {
  if (typeof value !== "string") return null
  const name = value.trim()
  return name ? name : null
}

const EMPTY_RESULT: IpinfoLookupResult = {
  ipCountry: null,
  ipCountryName: null,
  ipAsn: null,
  ipAsnName: null
}

export function parseIpinfoLiteResponse(data: unknown): IpinfoLookupResult {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return EMPTY_RESULT
  }
  const response = data as IpinfoLiteResponse
  return {
    ipCountry: normalizeCountryCode(response.country_code),
    ipCountryName: normalizeCountryName(response.country),
    ipAsn: normalizeAsn(response.asn),
    ipAsnName: normalizeAsnName(response.as_name)
  }
}

export async function lookupIpinfo(
  ipAddress: string | null | undefined
): Promise<IpinfoLookupResult> {
  const token = process.env.IPINFO_TOKEN
  if (!ipAddress || !token) return EMPTY_RESULT

  try {
    const response = await fetch(`https://api.ipinfo.io/lite/${encodeURIComponent(ipAddress)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store"
    })
    if (!response.ok) return EMPTY_RESULT
    return parseIpinfoLiteResponse(await response.json())
  } catch {
    return EMPTY_RESULT
  }
}

export const lookupIpinfoCountry = lookupIpinfo
