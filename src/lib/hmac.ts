import { createHmac, timingSafeEqual } from "node:crypto"

const DEFAULT_QR_CODE_VALIDITY_SECONDS = 15

function slotMs(qrCodeValiditySeconds = DEFAULT_QR_CODE_VALIDITY_SECONDS) {
  return qrCodeValiditySeconds * 1000
}

function secret() {
  const value = process.env.QR_SECRET?.trim()
  if (!value) {
    throw new Error("QR_SECRET is required")
  }
  if (Buffer.byteLength(value, "utf8") < 32) {
    throw new Error("QR_SECRET must be at least 32 bytes")
  }
  return value
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("hex")
}

export function currentSlot(now = Date.now(), qrCodeValiditySeconds = DEFAULT_QR_CODE_VALIDITY_SECONDS) {
  return Math.floor(now / slotMs(qrCodeValiditySeconds))
}

export function generateToken(
  sessionId: string,
  now = Date.now(),
  qrCodeValiditySeconds = DEFAULT_QR_CODE_VALIDITY_SECONDS
) {
  const payload = `${sessionId}:${Math.floor(now)}:${qrCodeValiditySeconds}`
  return Buffer.from(`${payload}.${sign(payload)}`, "utf8").toString("base64url")
}

export function verifyToken(
  token: string,
  gracePeriodSeconds: number,
  now = Date.now(),
  qrCodeValiditySeconds = DEFAULT_QR_CODE_VALIDITY_SECONDS
) {
  try {
    if (!token || token.length > 1024) return { valid: false as const }
    const decoded = Buffer.from(token, "base64url").toString("utf8")
    if (Buffer.byteLength(decoded, "utf8") > 768) return { valid: false as const }
    const tokenParts = decoded.split(".")
    if (tokenParts.length !== 2) return { valid: false as const }
    const [payload, signature] = tokenParts
    if (!payload || !signature) return { valid: false as const }

    const parts = payload.split(":")
    const [sessionId, timeText] = parts
    const timeValue = Number(timeText)
    const payloadValiditySeconds = Number(parts[2])
    if (!sessionId || !Number.isInteger(timeValue)) return { valid: false as const }

    const expected = sign(payload)
    const expectedBytes = Buffer.from(expected, "hex")
    const actualBytes = Buffer.from(signature, "hex")
    if (expectedBytes.length !== actualBytes.length || !timingSafeEqual(expectedBytes, actualBytes)) {
      return { valid: false as const }
    }

    const isIssuedAtPayload = parts.length >= 3 && Number.isInteger(payloadValiditySeconds)
    const issuedAt = isIssuedAtPayload ? timeValue : timeValue * slotMs(qrCodeValiditySeconds)
    if (issuedAt > now + 30_000) return { valid: false as const, sessionId }
    const expiresAt = issuedAt + slotMs(qrCodeValiditySeconds) + gracePeriodSeconds * 1000
    if (now > expiresAt) return { valid: false as const, sessionId }

    return {
      valid: true as const,
      sessionId,
      slot: currentSlot(issuedAt, qrCodeValiditySeconds),
      issuedAt: new Date(issuedAt),
      expiresAt: new Date(expiresAt)
    }
  } catch {
    return { valid: false as const }
  }
}
