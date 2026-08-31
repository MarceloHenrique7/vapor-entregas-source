-- Stage 19: real recurring billing metadata and payment history for Mercado Pago.
-- This migration is incremental and MySQL-only.

ALTER TABLE `subscription_plans`
  ADD COLUMN `externalPlanMode` VARCHAR(20) NULL;

ALTER TABLE `subscriptions`
  ADD COLUMN `externalReference` VARCHAR(180) NULL,
  ADD COLUMN `providerPlanId` VARCHAR(120) NULL,
  ADD UNIQUE INDEX `subscriptions_externalReference_key` (`externalReference`),
  ADD INDEX `subscriptions_providerPlanId_idx` (`providerPlanId`),
  MODIFY COLUMN `status` ENUM(
    'TRIAL',
    'PENDING',
    'ACTIVE',
    'PAST_DUE',
    'PAUSED',
    'CANCELED',
    'EXPIRED'
  ) NOT NULL DEFAULT 'PENDING';

CREATE TABLE `subscription_payments` (
  `id` CHAR(36) NOT NULL,
  `subscriptionId` CHAR(36) NOT NULL,
  `providerAuthorizedPaymentId` VARCHAR(120) NULL,
  `providerPaymentId` VARCHAR(120) NULL,
  `amount` DECIMAL(10, 2) NOT NULL,
  `currency` CHAR(3) NOT NULL,
  `status` VARCHAR(40) NOT NULL,
  `paidAt` DATETIME(3) NULL,
  `providerCreatedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `subscription_payments_providerAuthorizedPaymentId_key` (`providerAuthorizedPaymentId`),
  UNIQUE INDEX `subscription_payments_providerPaymentId_key` (`providerPaymentId`),
  INDEX `subscription_payments_subscriptionId_createdAt_idx` (`subscriptionId`, `createdAt`),
  INDEX `subscription_payments_status_createdAt_idx` (`status`, `createdAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `subscription_payments_subscriptionId_fkey`
    FOREIGN KEY (`subscriptionId`) REFERENCES `subscriptions` (`id`)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `subscription_payments_amount_check` CHECK (`amount` >= 0),
  CONSTRAINT `subscription_payments_provider_id_check`
    CHECK (`providerAuthorizedPaymentId` IS NOT NULL OR `providerPaymentId` IS NOT NULL)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Product prices are internal configuration. Existing subscriptions keep their
-- price snapshot; only new subscriptions use these plan values.
UPDATE `subscription_plans`
SET `monthlyPrice` = 19.90, `updatedAt` = CURRENT_TIMESTAMP(3)
WHERE `role` = 'MOTOBOY';

UPDATE `subscription_plans`
SET `monthlyPrice` = 29.90, `updatedAt` = CURRENT_TIMESTAMP(3)
WHERE `role` = 'COMPANY';
