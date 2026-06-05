ALTER TYPE "AuditEventType" ADD VALUE 'student_email_bind';
ALTER TYPE "AuditEventType" ADD VALUE 'student_email_unbind';

ALTER TABLE "students" ALTER COLUMN "studentCode" DROP NOT NULL;
