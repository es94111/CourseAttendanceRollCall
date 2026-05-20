import { generateToken } from "@/lib/hmac"
import { generateQRCodeDataURL } from "@/lib/qrcode"
import { requireAdmin } from "@/lib/api"
import { expireSessionIfNeeded } from "@/lib/session-expiry"
import { prisma } from "@/lib/prisma"

function event(name: string, data: unknown) {
  return `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`
}

export async function GET(request: Request, { params }: any) {
  const guard = await requireAdmin()
  if ("response" in guard) return guard.response
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const sendQr = async () => {
        const session = await expireSessionIfNeeded(params.id)
        if (session && session.status !== "active") {
          controller.enqueue(
            encoder.encode(
              event("session_status_changed", {
                sessionId: params.id,
                oldStatus: "active",
                newStatus: session.status,
                changedAt: new Date().toISOString()
              })
            )
          )
          controller.close()
          clearInterval(interval)
          return
        }
        const token = generateToken(params.id)
        const expiresAt = new Date((Math.floor(Date.now() / 15_000) + 1) * 15_000)
        const checkinUrl = new URL("/checkin", request.url)
        checkinUrl.searchParams.set("sessionId", params.id)
        checkinUrl.searchParams.set("token", token)
        controller.enqueue(
          encoder.encode(
            event("qrcode_update", {
              token,
              qrcodeDataUrl: await generateQRCodeDataURL(checkinUrl.toString()),
              slot: Math.floor(Date.now() / 15_000),
              expiresAt: expiresAt.toISOString(),
              remainingSeconds: Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 1000))
            })
          )
        )
        const detail = await prisma.attendanceSession.findUnique({
          where: { id: params.id },
          include: {
            course: { include: { enrollments: true } },
            records: { include: { student: true }, orderBy: { attendedAt: "desc" }, take: 1 }
          }
        })
        if (detail) {
          const [onTimeCount, lateCount, totalCount] = await Promise.all([
            prisma.attendanceRecord.count({ where: { sessionId: params.id, status: "on_time" } }),
            prisma.attendanceRecord.count({ where: { sessionId: params.id, status: "late" } }),
            prisma.attendanceRecord.count({ where: { sessionId: params.id } })
          ])
          const latest = detail.records[0]
          controller.enqueue(
            encoder.encode(
              event("attendance_count", {
                sessionId: params.id,
                onTimeCount,
                lateCount,
                totalCount,
                enrolledCount: detail.course.enrollments.length,
                latest: latest
                  ? {
                      studentName: latest.student.name,
                      studentCode: latest.student.studentCode,
                      status: latest.status,
                      attendedAt: latest.attendedAt?.toISOString() ?? null
                    }
                  : null
              })
            )
          )
        }
      }
      const interval = setInterval(sendQr, 15_000)
      await sendQr()
      request.signal.addEventListener("abort", () => {
        clearInterval(interval)
        controller.close()
      })
    }
  })
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    }
  })
}
