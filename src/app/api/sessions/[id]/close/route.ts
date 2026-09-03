import { error, handleRouteError, json, requireAdmin } from "@/lib/api"
import { prisma } from "@/lib/prisma"

export async function POST(_request: Request, props: any) {
  const params = await props.params
  const guard = await requireAdmin()
  if ("response" in guard) return guard.response
  try {
    const session = await prisma.attendanceSession.findUnique({ where: { id: params.id } })
    if (!session) return error("點名 Session 不存在", 404)
    if (session.status === "voided") return error("已作廢的 Session 無法變更狀態", 400)
    await prisma.attendanceSession.update({ where: { id: params.id }, data: { status: "closed" } })
    return json({ message: "點名已關閉" })
  } catch (cause) {
    return handleRouteError(cause)
  }
}
