CREATE TYPE "LegalDocumentType" AS ENUM ('TERMS_OF_USE', 'PRIVACY_POLICY');

CREATE TABLE "legal_acceptances" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "documentType" "LegalDocumentType" NOT NULL,
  "documentVersion" VARCHAR(40) NOT NULL,
  "acceptedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB,
  CONSTRAINT "legal_acceptances_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "account_closures" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "requestedAt" TIMESTAMPTZ(3) NOT NULL,
  "processedAt" TIMESTAMPTZ(3) NOT NULL,
  "retainedData" JSONB,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "account_closures_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "legal_acceptances_userId_documentType_documentVersion_key"
ON "legal_acceptances"("userId", "documentType", "documentVersion");
CREATE INDEX "legal_acceptances_documentType_documentVersion_idx"
ON "legal_acceptances"("documentType", "documentVersion");
CREATE UNIQUE INDEX "account_closures_userId_key" ON "account_closures"("userId");
CREATE INDEX "account_closures_processedAt_idx" ON "account_closures"("processedAt");

ALTER TABLE "legal_acceptances" ADD CONSTRAINT "legal_acceptances_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "account_closures" ADD CONSTRAINT "account_closures_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "legal_acceptances" ("id", "userId", "documentType", "documentVersion", "acceptedAt", "metadata")
SELECT md5("id"::text || ':terms')::uuid, "userId", 'TERMS_OF_USE', "version", "acceptedAt", '{"source":"LEGACY_BACKFILL"}'::jsonb
FROM "terms_acceptances"
ON CONFLICT ("userId", "documentType", "documentVersion") DO NOTHING;

INSERT INTO "legal_acceptances" ("id", "userId", "documentType", "documentVersion", "acceptedAt", "metadata")
SELECT md5("id"::text || ':privacy')::uuid, "userId", 'PRIVACY_POLICY', "version", "acceptedAt", '{"source":"LEGACY_BACKFILL"}'::jsonb
FROM "privacy_acceptances"
ON CONFLICT ("userId", "documentType", "documentVersion") DO NOTHING;
