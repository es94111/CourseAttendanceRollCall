import { error } from "@/lib/api"
import { signOut } from "@/lib/auth"
import { hasTrustedRequestOrigin } from "@/lib/request-security"

export async function POST(request: Request) {
  if (!hasTrustedRequestOrigin(request.headers)) return error("請求來源驗證失敗", 403)
  await signOut({ redirect: false })
  return new Response(null, { status: 204 })
}
