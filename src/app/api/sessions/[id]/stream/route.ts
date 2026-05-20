import { generateToken } from "@/lib/hmac"
import { buildCheckinUrl, generateQRCodeDataURL } from "@/lib/qrcode"
import { requireAdmin } from "@/lib/api"
import { expireSessionIfNeeded } from "@/lib/session-expiry"
import { prisma } from "@/lib/prisma"

function event(name: string, data: unknown) {
  return `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`
}

async function attendanceCountEvent(sessionId: string) {
  const detail = await prisma.attendanceSession.findUnique({
    where: { id: sessionId },
    include: {
      course: { include: { enrollments: true } },
      records: { include: { student: true }, orderBy: { attendedAt: "desc" }, take: 1 }
    }
  })
  if (!detail) return null
  const [onTimeCount, lateCount, totalCount] = await Promise.all([
    prisma.attendanceRecord.count({ where: { sessionId, status: "on_time" } }),
    prisma.attendanceRecord.count({ where: { sessionId, status: "late" } }),
    prisma.attendanceRecord.count({ where: { sessionId } })
  ])
  const latest = detail.records[0]
  return event("attendance_count", {
    sessionId,
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
}

export async function GET(request: Request, { params }: any) {
  const guard = await requireAdmin()
  if ("response" in guard) return guard.response
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      let timeout: ReturnType<typeof setTimeout> | null = null
      let closed = false
      const close = () => {
        if (closed) return
        closed = true
        if (timeout) clearTimeout(timeout)
        try {
          controller.close()
        } catch {
          // Client disconnected while the server was preparing the next SSE event.
        }
      }
      const enqueue = (payload: string) => {
        if (closed) return false
        try {
          controller.enqueue(encoder.encode(payload))
          return true
        } catch {
          close()
          return false
        }
      }
      request.signal.addEventListener("abort", close)
      const sendQr = async () => {
        try {
          if (closed) return
          const session = await expireSessionIfNeeded(params.id)
          if (closed) return
          if (!session) {
            close()
            return
          }
          if (session.status !== "active") {
            enqueue(
              event("session_status_changed", {
                sessionId: params.id,
                oldStatus: "active",
                newStatus: session.status,
                changedAt: new Date().toISOString()
              })
            )
            close()
            return
          }

          const validityMs = session.qrCodeValiditySeconds * 1000
          const token = generateToken(params.id, Date.now(), session.qrCodeValiditySeconds)
          const expiresAt = new Date((Math.floor(Date.now() / validityMs) + 1) * validityMs)
          const checkinUrl = buildCheckinUrl(
            request,
            params.id,
            token,
            session.qrCodeValiditySeconds,
            session.gracePeriodSeconds
          )
          const qrcodeDataUrl = await generateQRCodeDataURL(checkinUrl)
          if (
            !enqueue(
              event("qrcode_update", {
                token,
                checkinUrl,
                qrcodeDataUrl,
                slot: Math.floor(Date.now() / validityMs),
                expiresAt: expiresAt.toISOString(),
                validitySeconds: session.qrCodeValiditySeconds,
                remainingSeconds: Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 1000))
              })
            )
          ) {
            return
          }

          if (!closed) {
            timeout = setTimeout(() => void sendQr(), Math.max(5, session.qrCodeValiditySeconds) * 1000)
          }
          void attendanceCountEvent(params.id)
            .then((payload) => {
              if (payload) enqueue(payload)
            })
            .catch(() => {
              // QR rotation should not be blocked by attendance summary refresh.
            })
        } catch {
          close()
        }
      }
      await sendQr()
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
