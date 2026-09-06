const DEFAULT_QR_CODE_VALIDITY_SECONDS = 15

// 此模組在學生瀏覽器（checkin 頁）執行。Next.js 以 buffer@5 polyfill client 端的
// Buffer，但該實作不支援 "base64url" 編碼（會 throw Unknown encoding），因此不能
// 直接用 Buffer.from(token, "base64url")——瀏覽器上會永遠解析失敗，頁面卡在
// 「點名資料載入中」。改用原生 atob，Node（SSR／測試）才退回 Buffer。
function decodeBase64Url(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/")
  if (typeof atob === "function") {
    const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="))
    return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)))
  }
  return Buffer.from(base64, "base64").toString("utf8")
}

export function parseTokenSlot(
  token: string,
  qrCodeValiditySeconds = DEFAULT_QR_CODE_VALIDITY_SECONDS
) {
  try {
    const decoded = decodeBase64Url(token)
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
    return {
      sessionId,
      slot: timeValue,
      expiresAt: new Date((timeValue + 1) * qrCodeValiditySeconds * 1000)
    }
  } catch {
    return null
  }
}
