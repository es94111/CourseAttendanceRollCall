import { createHmac, timingSafeEqual } from "node:crypto"

const SLOT_MS = 15_000

function secret() {
  const value = process.env.QR_SECRET
  if (!value) {
    throw new Error("QR_SECRET is required")
  }
  return value
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("hex")
}

export function currentSlot(now = Date.now()) {
  return Math.floor(now / SLOT_MS)
}

export function generateToken(sessionId: string, now = Date.now()) {
  const payload = `${sessionId}:${currentSlot(now)}`
  return Buffer.from(`${payload}.${sign(payload)}`, "utf8").toString("base64url")
}

export function verifyToken(token: string, gracePeriodSeconds: number, now = Date.now()) {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8")
    const [payload, signature] = decoded.split(".")
    if (!payload || !signature) return { valid: false as const }

    const [sessionId, slotText] = payload.split(":")
    const slot = Number(slotText)
    if (!sessionId || !Number.isInteger(slot)) return { valid: false as const }

    const expected = sign(payload)
    const expectedBytes = Buffer.from(expected, "hex")
    const actualBytes = Buffer.from(signature, "hex")
    if (expectedBytes.length !== actualBytes.length || !timingSafeEqual(expectedBytes, actualBytes)) {
      return { valid: false as const }
    }

    const issuedAt = slot * SLOT_MS
    const expiresAt = issuedAt + SLOT_MS + gracePeriodSeconds * 1000
    if (now > expiresAt) return { valid: false as const, sessionId }

    return { valid: true as const, sessionId, slot, expiresAt: new Date(expiresAt) }
  } catch {
    return { valid: false as const }
  }
}
