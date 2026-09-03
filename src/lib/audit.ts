import { logger } from "@/lib/logger"
import { prisma } from "@/lib/prisma"
import type { AuditEventType } from "@/types"

interface AuditInput {
  eventType: AuditEventType
  actorId?: string | null
  actorEmail: string
  target: unknown
  oldValue?: unknown
  newValue?: unknown
  reason?: string | null
}

export async function writeAuditLog(input: AuditInput) {
  const record = await prisma.auditLog.create({
    data: {
      eventType: input.eventType,
      actorId: input.actorId ?? null,
      actorEmail: input.actorEmail,
      target: input.target as object,
      oldValue: input.oldValue === undefined ? undefined : (input.oldValue as object),
      newValue: input.newValue === undefined ? undefined : (input.newValue as object),
      reason: input.reason ?? null
    }
  })
  logger.info("audit", input)
  return record
}
