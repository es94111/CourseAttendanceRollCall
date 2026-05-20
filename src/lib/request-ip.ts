function firstHeaderValue(value: string | null) {
  return value
    ?.split(",")
    .map((item) => item.trim())
    .find(Boolean) ?? null
}

function normalizeCountryCode(value: string | null) {
  const country = firstHeaderValue(value)?.toUpperCase() ?? null
  return country && /^[A-Z0-9]{2}$/.test(country) ? country : null
}

export function getClientIpMetadata(headers: Headers) {
  return {
    ipAddress:
      firstHeaderValue(headers.get("cf-connecting-ip")) ??
      firstHeaderValue(headers.get("true-client-ip")) ??
      firstHeaderValue(headers.get("x-real-ip")) ??
      firstHeaderValue(headers.get("x-forwarded-for")),
    ipCountry: normalizeCountryCode(headers.get("cf-ipcountry"))
  }
}

export function formatIpLocation(countryCode: string | null | undefined, countryName?: string | null) {
  if (countryName && countryCode) return `${countryName} (${countryCode})`
  if (countryName) return countryName
  if (!countryCode) return ""
  if (countryCode === "XX") return "未知地區"
  if (countryCode === "T1") return "Tor 網路"
  return countryCode
}
