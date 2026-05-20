ALTER TYPE "AuditEventType" ADD VALUE 'session_settings_update';

ALTER TABLE "attendance_sessions"
ADD COLUMN "qrCodeValiditySeconds" INTEGER NOT NULL DEFAULT 15;
