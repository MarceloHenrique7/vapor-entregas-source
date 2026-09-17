-- Additive Control Center access grants. Manual access is deliberately kept
-- separate from Mercado Pago subscriptions and payments.

ALTER TABLE `company_profiles`
  ADD COLUMN `proExpiresAt` DATETIME(3) NULL,
  ADD COLUMN `proAccessSource` ENUM(
    'ADMIN_GRANTED',
    'PROMOTIONAL',
    'COMPENSATION',
    'EXTERNAL_PAYMENT',
    'PARTNER',
    'TEST'
  ) NULL,
  ADD INDEX `company_profiles_proEnabled_proExpiresAt_idx` (`proEnabled`, `proExpiresAt`);

CREATE TABLE `manual_access_grants` (
  `id` CHAR(36) NOT NULL,
  `activeGrantUserKey` CHAR(36) NULL,
  `userId` CHAR(36) NOT NULL,
  `planId` CHAR(36) NOT NULL,
  `reasonType` ENUM(
    'COURTESY',
    'TEST',
    'COMPENSATION',
    'EXTERNAL_PAYMENT',
    'SUPPORT',
    'OTHER'
  ) NOT NULL,
  `reason` VARCHAR(1000) NOT NULL,
  `startsAt` DATETIME(3) NOT NULL,
  `endsAt` DATETIME(3) NOT NULL,
  `grantedByAdminId` CHAR(36) NOT NULL,
  `revokedAt` DATETIME(3) NULL,
  `revokedByAdminId` CHAR(36) NULL,
  `revokedReason` VARCHAR(1000) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `manual_access_grants_one_active_per_user_key` (`activeGrantUserKey`),
  INDEX `manual_access_grants_userId_revokedAt_endsAt_idx` (`userId`, `revokedAt`, `endsAt`),
  INDEX `manual_access_grants_planId_createdAt_idx` (`planId`, `createdAt`),
  INDEX `manual_access_grants_grantedByAdminId_createdAt_idx` (`grantedByAdminId`, `createdAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `manual_access_grants_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `users` (`id`)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `manual_access_grants_planId_fkey`
    FOREIGN KEY (`planId`) REFERENCES `subscription_plans` (`id`)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `manual_access_grants_grantedByAdminId_fkey`
    FOREIGN KEY (`grantedByAdminId`) REFERENCES `users` (`id`)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `manual_access_grants_revokedByAdminId_fkey`
    FOREIGN KEY (`revokedByAdminId`) REFERENCES `users` (`id`)
    ON DELETE RESTRICT ON UPDATE RESTRICT
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `admin_actions`
  MODIFY `actionType` ENUM(
    'USER_ACTIVATED',
    'USER_SUSPENDED',
    'USER_BANNED',
    'USER_REACTIVATED',
    'REPORT_STATUS_CHANGED',
    'PRICING_RULE_CHANGED',
    'SUBSCRIPTION_PLAN_CHANGED',
    'COMPANY_PRO_CHANGED',
    'MOTOBOY_PLAN_GRANTED',
    'MOTOBOY_PLAN_EXTENDED',
    'MOTOBOY_PLAN_REVOKED',
    'COMPANY_PRO_ENABLED',
    'COMPANY_PRO_EXTENDED',
    'COMPANY_PRO_DISABLED',
    'REVIEW_HIDDEN',
    'REVIEW_RESTORED',
    'REPORT_RESOLVED',
    'SETTING_CHANGED',
    'ADMIN_OVERRIDE'
  ) NOT NULL;
