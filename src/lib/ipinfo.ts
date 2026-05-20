interface IpinfoLiteResponse {
  country_code?: unknown
  country?: unknown
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

export function parseIpinfoLiteResponse(data: unknown) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { ipCountry: null, ipCountryName: null }
  }
  const response = data as IpinfoLiteResponse
  const ipCountry = normalizeCountryCode(response.country_code)
  const ipCountryName = normalizeCountryName(response.country)
  return { ipCountry, ipCountryName }
}

export async function lookupIpinfoCountry(ipAddress: string | null | undefined) {
  const token = process.env.IPINFO_TOKEN
  if (!ipAddress || !token) return { ipCountry: null, ipCountryName: null }

  try {
    const response = await fetch(`https://api.ipinfo.io/lite/${encodeURIComponent(ipAddress)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store"
    })
    if (!response.ok) return { ipCountry: null, ipCountryName: null }
    return parseIpinfoLiteResponse(await response.json())
  } catch {
    return { ipCountry: null, ipCountryName: null }
  }
}
