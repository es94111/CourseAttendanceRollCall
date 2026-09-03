import { error, handleRouteError, json, parseJson, requireAdmin } from "@/lib/api"
import { normalizeEmail } from "@/lib/email"
import { prisma } from "@/lib/prisma"
import { studentSchema } from "@/lib/validation"

export async function GET() {
  const guard = await requireAdmin()
  if ("response" in guard) return guard.response
  try {
    const students = await prisma.student.findMany({
      orderBy: [{ studentCode: "asc" }, { name: "asc" }]
    })
    return json(
      students.map((student) => ({
        id: student.id,
        studentCode: student.studentCode,
        name: student.name,
        googleEmail: student.googleEmail,
        isGoogleLinked: Boolean(student.userId)
      }))
    )
  } catch (cause) {
    return handleRouteError(cause)
  }
}

export async function POST(request: Request) {
  const guard = await requireAdmin()
  if ("response" in guard) return guard.response
  const parsed = await parseJson(request, studentSchema)
  if ("response" in parsed) return parsed.response
  try {
    const student = await prisma.student.create({
      data: {
        studentCode: parsed.data.studentCode || null,
        name: parsed.data.name,
        googleEmail: normalizeEmail(parsed.data.googleEmail)
      }
    })
    return json(student, { status: 201 })
  } catch (cause: any) {
    if (cause?.code === "P2002") return error("學號或 Google Email 已存在", 409)
    return handleRouteError(cause)
  }
}
