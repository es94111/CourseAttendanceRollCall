CREATE TYPE "UserRole" AS ENUM ('admin', 'student');
CREATE TYPE "CourseStatus" AS ENUM ('active', 'archived');
CREATE TYPE "SessionStatus" AS ENUM ('active', 'closed', 'expired', 'voided');
CREATE TYPE "AttendanceStatus" AS ENUM ('on_time', 'late', 'leave', 'absent');
CREATE TYPE "AuditEventType" AS ENUM ('export_attendance', 'manual_attendance_override', 'leave_record_add', 'void_session', 'role_change', 'delete_student_data', 'session_opened');

CREATE TABLE "users" (
  "id" TEXT NOT NULL,
  "name" TEXT,
  "email" TEXT NOT NULL,
  "emailVerified" TIMESTAMP(3),
  "image" TEXT,
  "role" "UserRole" NOT NULL DEFAULT 'student',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "accounts" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  "refresh_token" TEXT,
  "access_token" TEXT,
  "expires_at" INTEGER,
  "token_type" TEXT,
  "scope" TEXT,
  "id_token" TEXT,
  "session_state" TEXT,
  CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sessions" (
  "id" TEXT NOT NULL,
  "sessionToken" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "expires" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "verification_tokens" (
  "identifier" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "expires" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "students" (
  "id" TEXT NOT NULL,
  "studentCode" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "googleEmail" TEXT,
  "userId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "courses" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "dayOfWeek" INTEGER NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  "lateThresholdMinutes" INTEGER NOT NULL DEFAULT 0,
  "status" "CourseStatus" NOT NULL DEFAULT 'active',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "course_enrollments" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "course_enrollments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "attendance_sessions" (
  "id" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "officialStartTime" TIMESTAMP(3) NOT NULL,
  "autoExpireMinutes" INTEGER,
  "gracePeriodSeconds" INTEGER NOT NULL DEFAULT 60,
  "status" "SessionStatus" NOT NULL DEFAULT 'active',
  "voidReason" TEXT,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "attendance_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "attendance_records" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "status" "AttendanceStatus" NOT NULL,
  "attendedAt" TIMESTAMP(3),
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "isManual" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "leave_records" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "leave_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_logs" (
  "id" TEXT NOT NULL,
  "eventType" "AuditEventType" NOT NULL,
  "actorId" TEXT NOT NULL,
  "actorEmail" TEXT NOT NULL,
  "target" JSONB NOT NULL,
  "oldValue" JSONB,
  "newValue" JSONB,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");
CREATE UNIQUE INDEX "students_studentCode_key" ON "students"("studentCode");
CREATE UNIQUE INDEX "students_googleEmail_key" ON "students"("googleEmail");
CREATE UNIQUE INDEX "students_userId_key" ON "students"("userId");
CREATE INDEX "students_googleEmail_idx" ON "students"("googleEmail");
CREATE UNIQUE INDEX "course_enrollments_studentId_courseId_key" ON "course_enrollments"("studentId", "courseId");
CREATE INDEX "attendance_sessions_courseId_status_idx" ON "attendance_sessions"("courseId", "status");
CREATE UNIQUE INDEX "attendance_records_sessionId_studentId_key" ON "attendance_records"("sessionId", "studentId");
CREATE INDEX "attendance_records_sessionId_attendedAt_idx" ON "attendance_records"("sessionId", "attendedAt");
CREATE INDEX "audit_logs_eventType_createdAt_idx" ON "audit_logs"("eventType", "createdAt");
CREATE INDEX "audit_logs_actorEmail_createdAt_idx" ON "audit_logs"("actorEmail", "createdAt");

ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "students" ADD CONSTRAINT "students_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "attendance_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "leave_records" ADD CONSTRAINT "leave_records_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "leave_records" ADD CONSTRAINT "leave_records_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "attendance_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
