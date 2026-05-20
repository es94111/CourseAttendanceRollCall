ALTER TYPE "AuditEventType" ADD VALUE 'allowed_email_domains_update';

CREATE TABLE "allowed_email_domains" (
  "id" TEXT NOT NULL,
  "domain" TEXT NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "allowed_email_domains_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "allowed_email_domains_domain_key" ON "allowed_email_domains"("domain");
