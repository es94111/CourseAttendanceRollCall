import { prisma } from "@/lib/prisma"
import { error, handleRouteError, json, parseJson, requireAdmin } from "@/lib/api"
import { studentSchema } from "@/lib/validation"
import { normalizeEmail } from "@/lib/email"

export async function PATCH(request: Request, { params }: any) {
  const guard = await requireAdmin()
  if ("response" in guard) return guard.response
  const parsed = await parseJson(request, studentSchema)
  if ("response" in parsed) return parsed.response
  try {
    const existing = await prisma.student.findUnique({ where: { id: params.id } })
    if (!existing) return error("學生不存在", 404)
    const googleEmail = normalizeEmail(parsed.data.googleEmail)
    const userId = existing.googleEmail === googleEmail ? existing.userId : null
    const student = await prisma.student.update({
      where: { id: params.id },
      data: {
        studentCode: parsed.data.studentCode,
        name: parsed.data.name,
        googleEmail,
        userId
      }
    })
    return json(student)
  } catch (cause: any) {
    if (cause?.code === "P2002") return error("學號或 Google Email 已存在", 409)
    if (cause?.code === "P2025") return error("學生不存在", 404)
    return handleRouteError(cause)
  }
}
