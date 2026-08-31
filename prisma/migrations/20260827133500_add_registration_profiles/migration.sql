-- CreateEnum
CREATE TYPE "SupportedCity" AS ENUM ('PETROLINA_PE', 'JUAZEIRO_BA');

-- CreateEnum
CREATE TYPE "CompanyDocumentType" AS ENUM ('CPF', 'CNPJ');

-- CreateTable
CREATE TABLE "motoboy_profiles" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "cpfEncrypted" TEXT NOT NULL,
    "cpfHash" CHAR(64) NOT NULL,
    "cpfLastDigits" CHAR(2) NOT NULL,
    "rgEncrypted" TEXT NOT NULL,
    "rgHash" CHAR(64) NOT NULL,
    "birthDate" DATE NOT NULL,
    "city" "SupportedCity" NOT NULL,
    "legalResponsibilityAcceptedAt" TIMESTAMPTZ(3) NOT NULL,
    "intermediationAcceptedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "motoboy_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_profiles" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "fantasyName" VARCHAR(120) NOT NULL,
    "documentType" "CompanyDocumentType" NOT NULL,
    "legalDocumentEncrypted" TEXT NOT NULL,
    "legalDocumentHash" CHAR(64) NOT NULL,
    "legalDocumentLastDigits" CHAR(4) NOT NULL,
    "city" "SupportedCity" NOT NULL,
    "address" VARCHAR(180) NOT NULL,
    "addressNumber" VARCHAR(20) NOT NULL,
    "neighborhood" VARCHAR(100) NOT NULL,
    "complement" VARCHAR(120),
    "referencePoint" VARCHAR(180),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "company_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "terms_acceptances" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "version" VARCHAR(40) NOT NULL,
    "acceptedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "terms_acceptances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "privacy_acceptances" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "version" VARCHAR(40) NOT NULL,
    "acceptedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "privacy_acceptances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "motoboy_profiles_userId_key" ON "motoboy_profiles"("userId");
CREATE UNIQUE INDEX "motoboy_profiles_cpfHash_key" ON "motoboy_profiles"("cpfHash");
CREATE INDEX "motoboy_profiles_city_idx" ON "motoboy_profiles"("city");
CREATE INDEX "motoboy_profiles_rgHash_idx" ON "motoboy_profiles"("rgHash");
CREATE UNIQUE INDEX "company_profiles_userId_key" ON "company_profiles"("userId");
CREATE UNIQUE INDEX "company_profiles_legalDocumentHash_key" ON "company_profiles"("legalDocumentHash");
CREATE INDEX "company_profiles_city_idx" ON "company_profiles"("city");
CREATE UNIQUE INDEX "terms_acceptances_userId_version_key" ON "terms_acceptances"("userId", "version");
CREATE INDEX "terms_acceptances_version_idx" ON "terms_acceptances"("version");
CREATE UNIQUE INDEX "privacy_acceptances_userId_version_key" ON "privacy_acceptances"("userId", "version");
CREATE INDEX "privacy_acceptances_version_idx" ON "privacy_acceptances"("version");

-- AddForeignKey
ALTER TABLE "motoboy_profiles" ADD CONSTRAINT "motoboy_profiles_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "company_profiles" ADD CONSTRAINT "company_profiles_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "terms_acceptances" ADD CONSTRAINT "terms_acceptances_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "privacy_acceptances" ADD CONSTRAINT "privacy_acceptances_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
