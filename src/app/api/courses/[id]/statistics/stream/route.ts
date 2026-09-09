import { requireAdmin } from "@/lib/api"
import { getCourseStatistics } from "@/lib/course-statistics"

export async function GET(request: Request, props: any) {
  const params = await props.params
  const guard = await requireAdmin()
  if ("response" in guard) return guard.response
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      let interval: ReturnType<typeof setInterval> | null = null
      let closed = false
      let running = false
      let lastPayload = ""

      const close = () => {
        if (closed) return
        closed = true
        if (interval) clearInterval(interval)
        request.signal.removeEventListener("abort", close)
        try {
          controller.close()
        } catch {
          // The client may have disconnected while a database query was running.
        }
      }

      const emit = (name: string, data: unknown) => {
        if (closed) return false
        try {
          controller.enqueue(encoder.encode(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`))
          return true
        } catch {
          close()
          return false
        }
      }

      const send = async () => {
        if (closed || running) return
        running = true
        try {
          const result = await getCourseStatistics(params.id)
          if (closed) return
          if (!result.hasActiveSession) {
            emit("statistics_stream_closed", { reason: "no_active_session" })
            close()
            return
          }
          const payload = JSON.stringify(result.data)
          if (payload !== lastPayload) {
            lastPayload = payload
            emit("statistics_update", result.data)
          }
        } catch {
          emit("statistics_stream_closed", { reason: "query_error" })
          close()
        } finally {
          running = false
        }
      }

      request.signal.addEventListener("abort", close)
      if (request.signal.aborted) {
        close()
        return
      }
      interval = setInterval(() => void send(), 2000)
      void send()
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
