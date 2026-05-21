import { prisma } from "@/lib/prisma"

export const IP_SHARE_LIMIT_KEY = "max_attendance_per_ip_per_session"
export const IP_SHARE_LIMIT_MAX = 1000

function clamp(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(IP_SHARE_LIMIT_MAX, Math.trunc(value)))
}

function envFallback(): number {
  const env = Number(process.env.MAX_ATTENDANCE_PER_IP_PER_SESSION)
  return Number.isFinite(env) && env > 0 ? clamp(env) : 0
}

export async function getIpShareLimit(): Promise<number> {
  const row = await prisma.systemSetting.findUnique({ where: { key: IP_SHARE_LIMIT_KEY } })
  if (!row) return envFallback()
  const parsed = Number(row.value)
  return Number.isFinite(parsed) ? clamp(parsed) : envFallback()
}

export async function setIpShareLimit(value: number): Promise<number> {
  const safe = clamp(value)
  const stringValue = String(safe)
  await prisma.systemSetting.upsert({
    where: { key: IP_SHARE_LIMIT_KEY },
    create: { key: IP_SHARE_LIMIT_KEY, value: stringValue },
    update: { value: stringValue }
  })
  return safe
}
