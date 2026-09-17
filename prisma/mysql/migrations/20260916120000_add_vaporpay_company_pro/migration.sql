-- VaporPay tracks declarations between the company and motoboy. It never
-- represents custody, settlement or proof of a bank transfer.
-- Existing deliveries remain UNTRACKED; application-created deliveries use PENDING.

ALTER TABLE `company_profiles`
  ADD COLUMN `proEnabled` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `proEnabledAt` DATETIME(3) NULL;

ALTER TABLE `deliveries`
  ADD COLUMN `paymentStatus` ENUM(
    'UNTRACKED',
    'PENDING',
    'REPORTED_PAID',
    'CONFIRMED',
    'DISPUTED'
  ) NOT NULL DEFAULT 'UNTRACKED',
  ADD COLUMN `paymentReportedAt` DATETIME(3) NULL,
  ADD COLUMN `paymentConfirmedAt` DATETIME(3) NULL,
  ADD COLUMN `paymentStatusUpdatedAt` DATETIME(3) NULL,
  ADD INDEX `deliveries_companyId_paymentStatus_createdAt_idx` (`companyId`, `paymentStatus`, `createdAt`),
  ADD INDEX `deliveries_motoboyId_paymentStatus_createdAt_idx` (`motoboyId`, `paymentStatus`, `createdAt`);

CREATE TABLE `delivery_payment_events` (
  `id` CHAR(36) NOT NULL,
  `deliveryId` CHAR(36) NOT NULL,
  `previousStatus` ENUM('UNTRACKED', 'PENDING', 'REPORTED_PAID', 'CONFIRMED', 'DISPUTED') NOT NULL,
  `newStatus` ENUM('UNTRACKED', 'PENDING', 'REPORTED_PAID', 'CONFIRMED', 'DISPUTED') NOT NULL,
  `actorUserId` CHAR(36) NOT NULL,
  `actorRole` ENUM('MOTOBOY', 'COMPANY', 'ADMIN') NOT NULL,
  `note` VARCHAR(300) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `delivery_payment_events_deliveryId_createdAt_idx` (`deliveryId`, `createdAt`),
  INDEX `delivery_payment_events_actorUserId_createdAt_idx` (`actorUserId`, `createdAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `delivery_payment_events_deliveryId_fkey`
    FOREIGN KEY (`deliveryId`) REFERENCES `deliveries` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `delivery_payment_events_actorUserId_fkey`
    FOREIGN KEY (`actorUserId`) REFERENCES `users` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `notifications`
  MODIFY `type` ENUM(
    'NEW_OPPORTUNITY',
    'DELIVERY_ACCEPTED',
    'DELIVERY_STATUS_CHANGED',
    'DELIVERY_CANCELLED',
    'DELIVERY_COMPLETED',
    'DELIVERY_PAYMENT_REPORTED',
    'DELIVERY_PAYMENT_CONFIRMED',
    'DELIVERY_PAYMENT_DISPUTED',
    'REPORT_UPDATED',
    'PLAN_PAYMENT_APPROVED',
    'PLAN_EXPIRING',
    'PLAN_EXPIRED',
    'ADMIN_NOTICE'
  ) NOT NULL;

ALTER TABLE `admin_actions`
  MODIFY `actionType` ENUM(
    'USER_ACTIVATED',
    'USER_SUSPENDED',
    'USER_BANNED',
    'USER_REACTIVATED',
    'REPORT_STATUS_CHANGED',
    'PRICING_RULE_CHANGED',
    'SUBSCRIPTION_PLAN_CHANGED',
    'COMPANY_PRO_CHANGED'
  ) NOT NULL;
