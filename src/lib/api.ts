import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { ZodError, type ZodSchema } from "zod"
import { auth } from "@/lib/auth"
import { checkConnectionAccess } from "@/lib/connection-access"
import { logger } from "@/lib/logger"
import {
  hasTrustedRequestOrigin,
  RequestSecurityError,
  readBoundedJsonBody
} from "@/lib/request-security"

export function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init)
}

export function error(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export async function requireUser() {
  const requestHeaders = await headers()
  if (!hasTrustedRequestOrigin(requestHeaders)) {
    return { response: error("請求來源驗證失敗", 403) as NextResponse }
  }
  const access = await checkConnectionAccess(requestHeaders)
  if (!access.allowed)
    return { response: error(access.reason ?? "此連線來源已被封鎖", 403) as NextResponse }
  const session = await auth()
  if (!session?.user?.id) return { response: error("請先登入", 401) as NextResponse }
  return { user: session.user }
}

export async function requireAdmin() {
  const result = await requireUser()
  if ("response" in result) return result
  if (result.user.role !== "admin") return { response: error("權限不足", 403) as NextResponse }
  return result
}

export async function parseJson<T>(request: Request, schema: ZodSchema<T>) {
  try {
    const body = await readBoundedJsonBody(request)
    return { data: schema.parse(body) }
  } catch (cause) {
    if (cause instanceof RequestSecurityError) {
      return { response: error(cause.message, cause.status) }
    }
    if (cause instanceof ZodError) {
      return { response: error(cause.issues[0]?.message ?? "資料格式錯誤", 400) }
    }
    return { response: error("資料格式錯誤", 400) }
  }
}

export function handleRouteError(cause: unknown) {
  logger.error("api_error", { error: cause instanceof Error ? cause.message : String(cause) })
  return error("伺服器內部錯誤", 500)
}
