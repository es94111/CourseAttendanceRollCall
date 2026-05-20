const DEFAULT_QR_CODE_VALIDITY_SECONDS = 15

export function parseTokenSlot(token: string, qrCodeValiditySeconds = DEFAULT_QR_CODE_VALIDITY_SECONDS) {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8")
    const [payload] = decoded.split(".")
    const [sessionId, slotText] = payload?.split(":") ?? []
    const slot = Number(slotText)
    if (!sessionId || !Number.isInteger(slot)) return null
    return { sessionId, slot, expiresAt: new Date((slot + 1) * qrCodeValiditySeconds * 1000) }
  } catch {
    return null
  }
}
