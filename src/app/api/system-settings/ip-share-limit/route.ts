import { z } from "zod"
import { handleRouteError, json, parseJson, requireAdmin } from "@/lib/api"
import { writeAuditLog } from "@/lib/audit"
import {
  getIpShareLimit,
  IP_SHARE_LIMIT_KEY,
  IP_SHARE_LIMIT_MAX,
  setIpShareLimit
} from "@/lib/system-settings"

const schema = z.object({
  value: z.number().int().min(0).max(IP_SHARE_LIMIT_MAX)
})

export async function GET() {
  const guard = await requireAdmin()
  if ("response" in guard) return guard.response
  try {
    return json({ value: await getIpShareLimit() })
  } catch (cause) {
    return handleRouteError(cause)
  }
}

export async function PUT(request: Request) {
  const guard = await requireAdmin()
  if ("response" in guard) return guard.response
  const parsed = await parseJson(request, schema)
  if ("response" in parsed) return parsed.response
  try {
    const oldValue = await getIpShareLimit()
    const saved = await setIpShareLimit(parsed.data.value)
    if (saved !== oldValue) {
      await writeAuditLog({
        eventType: "system_setting_update",
        actorId: guard.user.id,
        actorEmail: guard.user.email ?? "",
        target: { key: IP_SHARE_LIMIT_KEY },
        oldValue: { value: oldValue },
        newValue: { value: saved }
      })
    }
    return json({ value: saved })
  } catch (cause) {
    return handleRouteError(cause)
  }
}
