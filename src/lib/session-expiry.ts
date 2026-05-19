import { prisma } from "@/lib/prisma"

export async function expireSessionIfNeeded(sessionId: string) {
  const session = await prisma.attendanceSession.findUnique({ where: { id: sessionId } })
  if (!session) return null
  if (session.status !== "active" || !session.autoExpireMinutes) return session
  const expiresAt = session.createdAt.getTime() + session.autoExpireMinutes * 60_000
  if (Date.now() <= expiresAt) return session
  return prisma.attendanceSession.update({ where: { id: sessionId }, data: { status: "expired" } })
}

export function attendanceStatus(attendedAt: Date, officialStartTime: Date, lateThresholdMinutes: number) {
  const lateAt = officialStartTime.getTime() + lateThresholdMinutes * 60_000
  return attendedAt.getTime() <= lateAt ? "on_time" : "late"
}
