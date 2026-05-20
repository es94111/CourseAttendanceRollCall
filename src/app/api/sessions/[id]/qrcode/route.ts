import { generateToken } from "@/lib/hmac"
import { buildCheckinUrl, generateQRCodeDataURL } from "@/lib/qrcode"
import { handleRouteError, json, requireAdmin } from "@/lib/api"
import { expireSessionIfNeeded } from "@/lib/session-expiry"

export async function GET(request: Request, { params }: any) {
  const guard = await requireAdmin()
  if ("response" in guard) return guard.response
  try {
    const session = await expireSessionIfNeeded(params.id)
    if (!session) return json({ error: "點名 Session 不存在" }, { status: 404 })
    const validityMs = session.qrCodeValiditySeconds * 1000
    const token = generateToken(params.id, Date.now(), session.qrCodeValiditySeconds)
    const expiresAt = new Date((Math.floor(Date.now() / validityMs) + 1) * validityMs)
    const checkinUrl = buildCheckinUrl(
      request,
      params.id,
      token,
      session.qrCodeValiditySeconds,
      session.gracePeriodSeconds
    )
    return json({
      token,
      checkinUrl,
      qrcodeDataUrl: await generateQRCodeDataURL(checkinUrl),
      expiresAt: expiresAt.toISOString(),
      validitySeconds: session.qrCodeValiditySeconds,
      remainingSeconds: Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 1000))
    })
  } catch (cause) {
    return handleRouteError(cause)
  }
}
