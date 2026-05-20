import { generateToken } from "@/lib/hmac"
import { buildCheckinUrl, generateQRCodeDataURL } from "@/lib/qrcode"
import { handleRouteError, json, requireAdmin } from "@/lib/api"

export async function GET(request: Request, { params }: any) {
  const guard = await requireAdmin()
  if ("response" in guard) return guard.response
  try {
    const token = generateToken(params.id)
    const expiresAt = new Date((Math.floor(Date.now() / 15_000) + 1) * 15_000)
    const checkinUrl = buildCheckinUrl(request, params.id, token)
    return json({
      token,
      checkinUrl,
      qrcodeDataUrl: await generateQRCodeDataURL(checkinUrl),
      expiresAt: expiresAt.toISOString(),
      remainingSeconds: Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 1000))
    })
  } catch (cause) {
    return handleRouteError(cause)
  }
}
