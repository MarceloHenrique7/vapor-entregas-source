-- Checkout Bricks: one-off payment attempts and locally controlled access.
-- Incremental, MySQL-only migration. Legacy recurring identifiers are kept.

ALTER TABLE `subscriptions`
  ADD COLUMN `trialGrantedAt` DATETIME(3) NULL,
  ADD COLUMN `trialEndsAt` DATETIME(3) NULL;

UPDATE `subscriptions`
SET
  `trialGrantedAt` = COALESCE(`trialGrantedAt`, `currentPeriodStart`, `createdAt`),
  `trialEndsAt` = COALESCE(`trialEndsAt`, `currentPeriodEnd`)
WHERE `status` = 'TRIAL';

ALTER TABLE `subscription_payments`
  ADD COLUMN `userId` CHAR(36) NULL,
  ADD COLUMN `planId` CHAR(36) NULL,
  ADD COLUMN `externalReference` VARCHAR(180) NULL,
  ADD COLUMN `idempotencyKey` CHAR(36) NULL,
  ADD COLUMN `providerStatusDetail` VARCHAR(120) NULL,
  ADD COLUMN `paymentMethod` VARCHAR(40) NULL,
  ADD COLUMN `expiresAt` DATETIME(3) NULL,
  ADD COLUMN `accessGrantedAt` DATETIME(3) NULL,
  ADD COLUMN `safeMetadata` JSON NULL;

UPDATE `subscription_payments` AS `payment`
INNER JOIN `subscriptions` AS `subscription`
  ON `subscription`.`id` = `payment`.`subscriptionId`
SET
  `payment`.`userId` = `subscription`.`userId`,
  `payment`.`planId` = `subscription`.`planId`
WHERE `payment`.`userId` IS NULL OR `payment`.`planId` IS NULL;

ALTER TABLE `subscription_payments`
  ADD UNIQUE INDEX `subscription_payments_externalReference_key` (`externalReference`),
  ADD UNIQUE INDEX `subscription_payments_idempotencyKey_key` (`idempotencyKey`),
  ADD INDEX `subscription_payments_userId_createdAt_idx` (`userId`, `createdAt`),
  ADD INDEX `subscription_payments_planId_createdAt_idx` (`planId`, `createdAt`),
  ADD CONSTRAINT `subscription_payments_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `users` (`id`)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  ADD CONSTRAINT `subscription_payments_planId_fkey`
    FOREIGN KEY (`planId`) REFERENCES `subscription_plans` (`id`)
    ON DELETE RESTRICT ON UPDATE RESTRICT;

-- New accounts receive a single local seven-day trial. Existing access and
-- payment history are preserved.
UPDATE `subscription_plans`
SET `trialDays` = 7, `updatedAt` = CURRENT_TIMESTAMP(3)
WHERE `role` IN ('MOTOBOY', 'COMPANY');
