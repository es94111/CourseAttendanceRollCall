UPDATE "students"
SET "googleEmail" = LOWER(TRIM("googleEmail"))
WHERE "googleEmail" IS NOT NULL;
