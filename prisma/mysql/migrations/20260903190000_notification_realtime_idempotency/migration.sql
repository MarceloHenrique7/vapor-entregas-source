-- Keep user notifications idempotent while preserving existing rows.
ALTER TABLE `notifications`
  MODIFY `type` ENUM(
    'NEW_OPPORTUNITY',
    'DELIVERY_ACCEPTED',
    'DELIVERY_STATUS_CHANGED',
    'DELIVERY_CANCELLED',
    'DELIVERY_COMPLETED',
    'REPORT_UPDATED',
    'PLAN_PAYMENT_APPROVED',
    'PLAN_EXPIRING',
    'PLAN_EXPIRED',
    'ADMIN_NOTICE'
  ) NOT NULL,
  ADD COLUMN `eventKey` VARCHAR(191) NULL AFTER `userId`;

CREATE UNIQUE INDEX `notifications_userId_eventKey_key`
  ON `notifications`(`userId`, `eventKey`);
