import { handleRouteError, json, requireAdmin } from "@/lib/api"
import { getCourseStatistics } from "@/lib/course-statistics"

export async function GET(request: Request, props: any) {
  const params = await props.params
  const guard = await requireAdmin()
  if ("response" in guard) return guard.response
  try {
    const url = new URL(request.url)
    const { data } = await getCourseStatistics(params.id, {
      startDate: url.searchParams.get("startDate"),
      endDate: url.searchParams.get("endDate")
    })
    return json(data)
  } catch (cause) {
    return handleRouteError(cause)
  }
}
