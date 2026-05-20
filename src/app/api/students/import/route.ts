import { prisma } from "@/lib/prisma"
import { error, handleRouteError, json, requireAdmin } from "@/lib/api"
import { normalizeEmail } from "@/lib/email"

function parseCsv(text: string) {
  const lines = text.split(/\r?\n/).filter(Boolean)
  const headers = lines.shift()?.split(",").map((h) => h.trim()) ?? []
  return lines.map((line, index) => {
    const values = line.split(",").map((v) => v.trim())
    return {
      row: index + 2,
      studentCode: values[headers.indexOf("學號")],
      name: values[headers.indexOf("姓名")],
      googleEmail: normalizeEmail(values[headers.indexOf("Google Email")])
    }
  })
}

export async function POST(request: Request) {
  const guard = await requireAdmin()
  if ("response" in guard) return guard.response
  try {
    const form = await request.formData()
    const file = form.get("file")
    const courseId = form.get("courseId")
    if (!(file instanceof File)) return error("請上傳 CSV 檔案", 400)
    const rows = parseCsv(await file.text())
    const seenCodes = new Set<string>()
    const seenEmails = new Set<string>()
    const errors: Array<{ row: number; reason: string }> = []
    let successCount = 0

    for (const row of rows) {
      if (!row.studentCode || !row.name) {
        errors.push({ row: row.row, reason: "學號與姓名為必填" })
        continue
      }
      if (row.googleEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(row.googleEmail)) {
        errors.push({ row: row.row, reason: "Google Email 格式不符" })
        continue
      }
      if (seenCodes.has(row.studentCode) || (row.googleEmail && seenEmails.has(row.googleEmail))) {
        errors.push({ row: row.row, reason: "CSV 檔案內含重複資料" })
        continue
      }
      seenCodes.add(row.studentCode)
      if (row.googleEmail) seenEmails.add(row.googleEmail)
      try {
        await prisma.$transaction(async (tx) => {
          const student = await tx.student.create({
            data: {
              studentCode: row.studentCode,
              name: row.name,
              googleEmail: row.googleEmail || null
            }
          })
          if (typeof courseId === "string" && courseId) {
            await tx.courseEnrollment.create({
              data: { courseId, studentId: student.id }
            })
          }
        })
        successCount += 1
      } catch {
        errors.push({ row: row.row, reason: "學號或 Google Email 已存在" })
      }
    }

    return json({ successCount, skipCount: errors.length, errors })
  } catch (cause) {
    return handleRouteError(cause)
  }
}
