import { handleRouteError, json, requireAdmin } from "@/lib/api"
import { prisma } from "@/lib/prisma"

export async function POST(_request: Request, props: any) {
  const params = await props.params
  const guard = await requireAdmin()
  if ("response" in guard) return guard.response
  try {
    await prisma.attendanceSession.update({ where: { id: params.id }, data: { status: "closed" } })
    return json({ message: "點名已關閉" })
  } catch (cause) {
    return handleRouteError(cause)
  }
}
