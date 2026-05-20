ALTER TYPE "AuditEventType" ADD VALUE 'connection_access_update';

CREATE TABLE "connection_access_rules" (
  "id" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "note" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "connection_access_rules_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "connection_access_rules_action_targetType_value_key" ON "connection_access_rules"("action", "targetType", "value");
CREATE INDEX "connection_access_rules_enabled_action_targetType_idx" ON "connection_access_rules"("enabled", "action", "targetType");
