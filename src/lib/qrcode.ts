import QRCode from "qrcode"

export function generateQRCodeDataURL(url: string) {
  return QRCode.toDataURL(url, { errorCorrectionLevel: "M", margin: 1, width: 320 })
}

function firstHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim() || null
}

export function getPublicBaseUrl(request: Request) {
  const configuredUrl = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL
  if (configuredUrl) return new URL(configuredUrl).origin

  const forwardedHost = firstHeaderValue(request.headers.get("x-forwarded-host"))
  const host = forwardedHost ?? request.headers.get("host")
  const forwardedProto = firstHeaderValue(request.headers.get("x-forwarded-proto"))
  const proto = forwardedProto ?? new URL(request.url).protocol.replace(":", "")

  if (host) return `${proto}://${host}`

  return new URL(request.url).origin
}

export function buildCheckinUrl(
  request: Request,
  sessionId: string,
  token: string,
  qrCodeValiditySeconds: number
) {
  const checkinUrl = new URL("/checkin", getPublicBaseUrl(request))
  checkinUrl.searchParams.set("sessionId", sessionId)
  checkinUrl.searchParams.set("token", token)
  checkinUrl.searchParams.set("validitySeconds", String(qrCodeValiditySeconds))
  return checkinUrl.toString()
}
