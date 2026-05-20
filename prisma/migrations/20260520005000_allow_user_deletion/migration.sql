ALTER TYPE "AuditEventType" ADD VALUE 'delete_user';

ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_actorId_fkey";
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "attendance_sessions" ALTER COLUMN "createdBy" DROP NOT NULL;
ALTER TABLE "attendance_sessions" DROP CONSTRAINT "attendance_sessions_createdBy_fkey";
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_createdBy_fkey"
  FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
