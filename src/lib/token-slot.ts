const DEFAULT_QR_CODE_VALIDITY_SECONDS = 15

export function parseTokenSlot(token: string, qrCodeValiditySeconds = DEFAULT_QR_CODE_VALIDITY_SECONDS) {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8")
    const [payload] = decoded.split(".")
    const [sessionId, timeText, validityText] = payload?.split(":") ?? []
    const timeValue = Number(timeText)
    const payloadValiditySeconds = Number(validityText)
    if (!sessionId || !Number.isInteger(timeValue)) return null
    if (Number.isInteger(payloadValiditySeconds)) {
      return {
        sessionId,
        slot: Math.floor(timeValue / (qrCodeValiditySeconds * 1000)),
        expiresAt: new Date(timeValue + qrCodeValiditySeconds * 1000)
      }
    }
    return { sessionId, slot: timeValue, expiresAt: new Date((timeValue + 1) * qrCodeValiditySeconds * 1000) }
  } catch {
    return null
  }
}
