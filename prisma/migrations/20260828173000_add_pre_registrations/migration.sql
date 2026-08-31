CREATE TYPE "PreRegistrationType" AS ENUM ('MOTOBOY', 'COMPANY');

CREATE TABLE "pre_registrations" (
  "id" UUID NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "phone" VARCHAR(20) NOT NULL,
  "normalizedPhone" VARCHAR(14) NOT NULL,
  "type" "PreRegistrationType" NOT NULL,
  "consentNoticeVersion" VARCHAR(40) NOT NULL,
  "consentRecordedAt" TIMESTAMPTZ(3) NOT NULL,
  "convertedUserId" UUID,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "pre_registrations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "pre_registrations_normalized_phone_type_key"
  ON "pre_registrations"("normalizedPhone", "type");
CREATE INDEX "pre_registrations_type_created_at_idx"
  ON "pre_registrations"("type", "createdAt");
CREATE INDEX "pre_registrations_created_at_idx"
  ON "pre_registrations"("createdAt");
CREATE INDEX "pre_registrations_converted_user_id_idx"
  ON "pre_registrations"("convertedUserId");

ALTER TABLE "pre_registrations" ADD CONSTRAINT "pre_registrations_converted_user_id_fkey"
  FOREIGN KEY ("convertedUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
