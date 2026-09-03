import { requireAdmin } from "@/lib/api"

export async function GET(request: Request, props: any) {
  const params = await props.params
  const guard = await requireAdmin()
  if ("response" in guard) return guard.response
  const encoder = new TextEncoder()
  let lastPayload = ""
  const stream = new ReadableStream({
    start(controller) {
      const send = async () => {
        const response = await fetch(new URL(`/api/courses/${params.id}/statistics`, request.url), {
          headers: request.headers
        })
        const payload = await response.text()
        if (payload !== lastPayload) {
          lastPayload = payload
          controller.enqueue(encoder.encode(`event: statistics_update\ndata: ${payload}\n\n`))
        }
      }
      const interval = setInterval(send, 2000)
      void send()
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
