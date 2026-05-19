import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { error, handleRouteError, json, parseJson, requireAdmin } from "@/lib/api"
import { writeAuditLog } from "@/lib/audit"

export async function POST(request: Request, { params }: any) {
  const guard = await requireAdmin()
  if ("response" in guard) return guard.response
  const parsed = await parseJson(request, z.object({ reason: z.string().trim().min(1) }))
  if ("response" in parsed) return parsed.response
  try {
    const session = await prisma.attendanceSession.findUnique({ where: { id: params.id } })
    if (!session) return error("點名 Session 不存在", 404)
    if (session.status === "active") return error("進行中的 Session 需先關閉後才能作廢", 400)
    await prisma.attendanceSession.update({
      where: { id: params.id },
      data: { status: "voided", voidReason: parsed.data.reason }
    })
    await writeAuditLog({
      eventType: "void_session",
      actorId: guard.user.id,
      actorEmail: guard.user.email ?? "",
      target: { sessionId: params.id },
      reason: parsed.data.reason
    })
    return json({ message: "Session 已作廢" })
  } catch (cause) {
    return handleRouteError(cause)
  }
}
