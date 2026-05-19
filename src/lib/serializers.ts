import { toTaipeiIso } from "@/lib/time"

export function serializeCourse(course: any) {
  return {
    id: course.id,
    name: course.name,
    dayOfWeek: course.dayOfWeek,
    startTime: course.startTime,
    endTime: course.endTime,
    lateThresholdMinutes: course.lateThresholdMinutes,
    status: course.status,
    enrolledCount: course._count?.enrollments,
    createdAt: toTaipeiIso(course.createdAt)
  }
}
