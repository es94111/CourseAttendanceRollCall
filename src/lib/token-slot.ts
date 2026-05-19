export function parseTokenSlot(token: string) {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8")
    const [payload] = decoded.split(".")
    const [sessionId, slotText] = payload?.split(":") ?? []
    const slot = Number(slotText)
    if (!sessionId || !Number.isInteger(slot)) return null
    return { sessionId, slot, expiresAt: new Date((slot + 1) * 15_000) }
  } catch {
    return null
  }
}
