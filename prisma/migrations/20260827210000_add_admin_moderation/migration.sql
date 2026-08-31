CREATE TYPE "AdminActionType" AS ENUM (
  'USER_ACTIVATED',
  'USER_SUSPENDED',
  'USER_BANNED',
  'USER_REACTIVATED',
  'REPORT_STATUS_CHANGED'
);

ALTER TABLE "reports"
ADD COLUMN "adminNotes" VARCHAR(2000);

CREATE TABLE "admin_actions" (
  "id" UUID NOT NULL,
  "adminUserId" UUID NOT NULL,
  "targetUserId" UUID,
  "actionType" "AdminActionType" NOT NULL,
  "reason" VARCHAR(1000),
  "metadata" JSONB,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "admin_actions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "admin_actions_adminUserId_createdAt_idx" ON "admin_actions"("adminUserId", "createdAt");
CREATE INDEX "admin_actions_targetUserId_createdAt_idx" ON "admin_actions"("targetUserId", "createdAt");
CREATE INDEX "admin_actions_actionType_createdAt_idx" ON "admin_actions"("actionType", "createdAt");

ALTER TABLE "admin_actions" ADD CONSTRAINT "admin_actions_adminUserId_fkey"
FOREIGN KEY ("adminUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "admin_actions" ADD CONSTRAINT "admin_actions_targetUserId_fkey"
FOREIGN KEY ("targetUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
