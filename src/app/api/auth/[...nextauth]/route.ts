import type { NextRequest } from "next/server"
import { handlers } from "@/lib/auth"
import { checkConnectionAccess } from "@/lib/connection-access"

async function enforceAuthAccess(request: NextRequest) {
  const access = await checkConnectionAccess(request.headers, new URL(request.url).pathname)
  if (!access.allowed) return Response.json({ error: access.reason ?? "此連線來源已被封鎖" }, { status: 403 })
  return null
}

export async function GET(request: NextRequest) {
  const blocked = await enforceAuthAccess(request)
  if (blocked) return blocked
  return handlers.GET(request)
}

export async function POST(request: NextRequest) {
  const blocked = await enforceAuthAccess(request)
  if (blocked) return blocked
  return handlers.POST(request)
}
