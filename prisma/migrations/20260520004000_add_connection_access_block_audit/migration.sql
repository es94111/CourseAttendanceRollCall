ALTER TYPE "AuditEventType" ADD VALUE 'connection_access_block';

ALTER TABLE "audit_logs" ALTER COLUMN "actorId" DROP NOT NULL;
