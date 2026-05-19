import { prisma } from "@/lib/prisma"
import { error, handleRouteError, json, requireAdmin } from "@/lib/api"
import { expireSessionIfNeeded } from "@/lib/session-expiry"

export async function GET(_request: Request, { params }: any) {
  const guard = await requireAdmin()
  if ("response" in guard) return guard.response
  try {
    await expireSessionIfNeeded(params.id)
    const session = await prisma.attendanceSession.findUnique({
      where: { id: params.id },
      include: { course: true, records: true }
    })
    if (!session) return error("點名 Session 不存在", 404)
    return json({
      ...session,
      onTimeCount: session.records.filter((record) => record.status === "on_time").length,
      lateCount: session.records.filter((record) => record.status === "late").length,
      totalCount: session.records.length
    })
  } catch (cause) {
    return handleRouteError(cause)
  }
}
