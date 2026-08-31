-- Preserve existing history while making every transition auditable.
ALTER TABLE "delivery_status_history"
RENAME COLUMN "status" TO "newStatus";

ALTER TABLE "delivery_status_history"
ADD COLUMN "previousStatus" "DeliveryStatus",
ADD COLUMN "actorRole" "Role";

-- Existing stage-6 records only represent publication and acceptance.
UPDATE "delivery_status_history"
SET "previousStatus" = 'SEARCHING_MOTOBOY'
WHERE "newStatus" = 'ACCEPTED';

UPDATE "delivery_status_history" AS history
SET "actorRole" = users."role"
FROM "users" AS users
WHERE history."actorUserId" = users."id";
