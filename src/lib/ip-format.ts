export function formatIpLocation(
  countryCode: string | null | undefined,
  countryName?: string | null
) {
  if (countryName && countryCode) return `${countryName} (${countryCode})`
  if (countryName) return countryName
  if (!countryCode) return ""
  if (countryCode === "XX") return "未知地區"
  if (countryCode === "T1") return "Tor 網路"
  return countryCode
}
