-- CreateTable
CREATE TABLE `users` (
    `id` CHAR(36) NOT NULL,
    `role` ENUM('MOTOBOY', 'COMPANY', 'ADMIN') NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `email` VARCHAR(254) NOT NULL,
    `phone` VARCHAR(20) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `status` ENUM('ACTIVE', 'SUSPENDED', 'BLOCKED', 'DELETED') NOT NULL DEFAULT 'ACTIVE',
    `failedLoginAttempts` INTEGER NOT NULL DEFAULT 0,
    `lockedUntil` DATETIME(3) NULL,
    `passwordChangedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastLoginAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    UNIQUE INDEX `users_phone_key`(`phone`),
    INDEX `users_role_status_idx`(`role`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pre_registrations` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `phone` VARCHAR(20) NOT NULL,
    `normalizedPhone` VARCHAR(14) NOT NULL,
    `type` ENUM('MOTOBOY', 'COMPANY') NOT NULL,
    `consentNoticeVersion` VARCHAR(40) NOT NULL,
    `consentRecordedAt` DATETIME(3) NOT NULL,
    `convertedUserId` CHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `pre_registrations_type_createdAt_idx`(`type`, `createdAt`),
    INDEX `pre_registrations_createdAt_idx`(`createdAt`),
    INDEX `pre_registrations_convertedUserId_idx`(`convertedUserId`),
    UNIQUE INDEX `pre_registrations_normalizedPhone_type_key`(`normalizedPhone`, `type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `subscription_plans` (
    `id` CHAR(36) NOT NULL,
    `role` ENUM('MOTOBOY', 'COMPANY', 'ADMIN') NOT NULL,
    `name` VARCHAR(80) NOT NULL,
    `description` VARCHAR(240) NOT NULL,
    `monthlyPrice` DECIMAL(10, 2) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `trialDays` SMALLINT NOT NULL DEFAULT 0,
    `externalPlanId` VARCHAR(120) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `subscription_plans_role_key`(`role`),
    UNIQUE INDEX `subscription_plans_externalPlanId_key`(`externalPlanId`),
    INDEX `subscription_plans_active_role_idx`(`active`, `role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `subscriptions` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `planId` CHAR(36) NOT NULL,
    `provider` ENUM('MERCADO_PAGO') NOT NULL DEFAULT 'MERCADO_PAGO',
    `providerSubscriptionId` VARCHAR(120) NULL,
    `providerStatus` VARCHAR(40) NULL,
    `status` ENUM('TRIAL', 'PENDING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
    `monthlyPrice` DECIMAL(10, 2) NOT NULL,
    `checkoutUrl` TEXT NULL,
    `currentPeriodStart` DATETIME(3) NULL,
    `currentPeriodEnd` DATETIME(3) NULL,
    `nextPaymentAt` DATETIME(3) NULL,
    `canceledAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `subscriptions_providerSubscriptionId_key`(`providerSubscriptionId`),
    INDEX `subscriptions_userId_status_createdAt_idx`(`userId`, `status`, `createdAt`),
    INDEX `subscriptions_status_nextPaymentAt_idx`(`status`, `nextPaymentAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `subscription_events` (
    `id` CHAR(36) NOT NULL,
    `subscriptionId` CHAR(36) NULL,
    `providerEventId` VARCHAR(180) NOT NULL,
    `eventType` VARCHAR(100) NOT NULL,
    `payloadMetadata` JSON NULL,
    `processedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `subscription_events_providerEventId_key`(`providerEventId`),
    INDEX `subscription_events_subscriptionId_createdAt_idx`(`subscriptionId`, `createdAt`),
    INDEX `subscription_events_eventType_createdAt_idx`(`eventType`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `motoboy_profiles` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `cpfEncrypted` TEXT NOT NULL,
    `cpfHash` CHAR(64) NOT NULL,
    `cpfLastDigits` CHAR(2) NOT NULL,
    `rgEncrypted` TEXT NOT NULL,
    `rgHash` CHAR(64) NOT NULL,
    `birthDate` DATE NOT NULL,
    `city` ENUM('PETROLINA_PE', 'JUAZEIRO_BA') NOT NULL,
    `isOnline` BOOLEAN NOT NULL DEFAULT false,
    `onlineSince` DATETIME(3) NULL,
    `lastLocationAt` DATETIME(3) NULL,
    `lastLatitude` DECIMAL(9, 6) NULL,
    `lastLongitude` DECIMAL(9, 6) NULL,
    `legalResponsibilityAcceptedAt` DATETIME(3) NOT NULL,
    `intermediationAcceptedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `motoboy_profiles_userId_key`(`userId`),
    UNIQUE INDEX `motoboy_profiles_cpfHash_key`(`cpfHash`),
    INDEX `motoboy_profiles_city_idx`(`city`),
    INDEX `motoboy_profiles_isOnline_lastLocationAt_idx`(`isOnline`, `lastLocationAt`),
    INDEX `motoboy_profiles_rgHash_idx`(`rgHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `company_profiles` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `fantasyName` VARCHAR(120) NOT NULL,
    `documentType` ENUM('CPF', 'CNPJ') NOT NULL,
    `legalDocumentEncrypted` TEXT NOT NULL,
    `legalDocumentHash` CHAR(64) NOT NULL,
    `legalDocumentLastDigits` CHAR(4) NOT NULL,
    `city` ENUM('PETROLINA_PE', 'JUAZEIRO_BA') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `company_profiles_userId_key`(`userId`),
    UNIQUE INDEX `company_profiles_legalDocumentHash_key`(`legalDocumentHash`),
    INDEX `company_profiles_city_idx`(`city`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `company_locations` (
    `id` CHAR(36) NOT NULL,
    `companyId` CHAR(36) NOT NULL,
    `label` VARCHAR(80) NOT NULL DEFAULT 'Loja principal',
    `address` VARCHAR(180) NOT NULL,
    `number` VARCHAR(20) NOT NULL,
    `neighborhood` VARCHAR(100) NOT NULL,
    `complement` VARCHAR(120) NULL,
    `reference` VARCHAR(180) NULL,
    `city` ENUM('PETROLINA_PE', 'JUAZEIRO_BA') NOT NULL,
    `state` CHAR(2) NOT NULL,
    `postalCode` VARCHAR(9) NULL,
    `latitude` DECIMAL(9, 6) NULL,
    `longitude` DECIMAL(9, 6) NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `company_locations_companyId_idx`(`companyId`),
    INDEX `company_locations_companyId_isDefault_idx`(`companyId`, `isDefault`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `deliveries` (
    `id` CHAR(36) NOT NULL,
    `companyId` CHAR(36) NOT NULL,
    `motoboyId` CHAR(36) NULL,
    `pickupLocationId` CHAR(36) NOT NULL,
    `pickupLabel` VARCHAR(80) NOT NULL,
    `pickupAddress` VARCHAR(180) NOT NULL,
    `pickupNumber` VARCHAR(20) NOT NULL,
    `pickupNeighborhood` VARCHAR(100) NOT NULL,
    `pickupCity` ENUM('PETROLINA_PE', 'JUAZEIRO_BA') NOT NULL,
    `pickupState` CHAR(2) NOT NULL,
    `pickupLatitude` DECIMAL(9, 6) NOT NULL,
    `pickupLongitude` DECIMAL(9, 6) NOT NULL,
    `destinationAddress` VARCHAR(180) NOT NULL,
    `destinationNumber` VARCHAR(20) NOT NULL,
    `destinationNeighborhood` VARCHAR(100) NOT NULL,
    `destinationComplement` VARCHAR(120) NULL,
    `destinationReference` VARCHAR(180) NULL,
    `destinationCity` ENUM('PETROLINA_PE', 'JUAZEIRO_BA') NOT NULL,
    `destinationState` CHAR(2) NOT NULL,
    `destinationPostalCode` VARCHAR(9) NULL,
    `destinationLatitude` DECIMAL(9, 6) NOT NULL,
    `destinationLongitude` DECIMAL(9, 6) NOT NULL,
    `distanceEstimateKm` DECIMAL(8, 2) NOT NULL,
    `distanceMethod` ENUM('STRAIGHT_LINE') NOT NULL DEFAULT 'STRAIGHT_LINE',
    `suggestedPrice` DECIMAL(10, 2) NULL,
    `pricingRuleId` CHAR(36) NULL,
    `offeredPrice` DECIMAL(10, 2) NOT NULL,
    `paymentMethod` ENUM('PIX', 'CASH', 'COMPANY_SETTLEMENT', 'OTHER') NOT NULL,
    `notes` VARCHAR(500) NULL,
    `status` ENUM('SEARCHING_MOTOBOY', 'ACCEPTED', 'MOTOBOY_TO_PICKUP', 'ARRIVED_AT_PICKUP', 'PICKED_UP', 'IN_DELIVERY', 'COMPLETED', 'CANCELLED_BY_COMPANY', 'CANCELLED_BY_MOTOBOY', 'EXPIRED', 'DISPUTED') NOT NULL DEFAULT 'SEARCHING_MOTOBOY',
    `acceptedAt` DATETIME(3) NULL,
    `pickedUpAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `cancelledAt` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `deliveries_companyId_createdAt_idx`(`companyId`, `createdAt`),
    INDEX `deliveries_companyId_status_createdAt_idx`(`companyId`, `status`, `createdAt`),
    INDEX `deliveries_companyId_motoboyId_createdAt_idx`(`companyId`, `motoboyId`, `createdAt`),
    INDEX `deliveries_motoboyId_status_idx`(`motoboyId`, `status`),
    INDEX `deliveries_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `deliveries_pickupCity_status_idx`(`pickupCity`, `status`),
    INDEX `deliveries_pickupCity_status_expiresAt_idx`(`pickupCity`, `status`, `expiresAt`),
    INDEX `deliveries_pricingRuleId_idx`(`pricingRuleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pricing_rules` (
    `id` CHAR(36) NOT NULL,
    `city` ENUM('PETROLINA_PE', 'JUAZEIRO_BA') NOT NULL,
    `basePrice` DECIMAL(10, 2) NOT NULL,
    `pricePerKm` DECIMAL(10, 2) NOT NULL,
    `minimumPrice` DECIMAL(10, 2) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `activeFrom` DATETIME(3) NOT NULL,
    `activeTo` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `pricing_rules_city_enabled_activeFrom_idx`(`city`, `enabled`, `activeFrom`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `delivery_extras` (
    `id` CHAR(36) NOT NULL,
    `deliveryId` CHAR(36) NOT NULL,
    `type` ENUM('WAITING', 'RETURN', 'PURCHASE', 'SPECIAL_WEIGHT_VOLUME', 'CANCELLATION_AFTER_DEPARTURE', 'OTHER') NOT NULL,
    `description` VARCHAR(240) NOT NULL,
    `amount` DECIMAL(10, 2) NULL,
    `informedByUserId` CHAR(36) NOT NULL,
    `informedByRole` ENUM('MOTOBOY', 'COMPANY', 'ADMIN') NOT NULL,
    `status` ENUM('PENDING', 'ACKNOWLEDGED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `note` VARCHAR(300) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `delivery_extras_deliveryId_status_createdAt_idx`(`deliveryId`, `status`, `createdAt`),
    INDEX `delivery_extras_informedByUserId_createdAt_idx`(`informedByUserId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `delivery_extra_history` (
    `id` CHAR(36) NOT NULL,
    `extraId` CHAR(36) NOT NULL,
    `previousStatus` ENUM('PENDING', 'ACKNOWLEDGED', 'REJECTED', 'CANCELLED') NULL,
    `newStatus` ENUM('PENDING', 'ACKNOWLEDGED', 'REJECTED', 'CANCELLED') NOT NULL,
    `action` ENUM('CREATED', 'ACKNOWLEDGED', 'REJECTED', 'CANCELLED') NOT NULL,
    `actorUserId` CHAR(36) NOT NULL,
    `actorRole` ENUM('MOTOBOY', 'COMPANY', 'ADMIN') NOT NULL,
    `note` VARCHAR(300) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `delivery_extra_history_extraId_createdAt_idx`(`extraId`, `createdAt`),
    INDEX `delivery_extra_history_actorUserId_createdAt_idx`(`actorUserId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `delivery_status_history` (
    `id` CHAR(36) NOT NULL,
    `deliveryId` CHAR(36) NOT NULL,
    `previousStatus` ENUM('SEARCHING_MOTOBOY', 'ACCEPTED', 'MOTOBOY_TO_PICKUP', 'ARRIVED_AT_PICKUP', 'PICKED_UP', 'IN_DELIVERY', 'COMPLETED', 'CANCELLED_BY_COMPANY', 'CANCELLED_BY_MOTOBOY', 'EXPIRED', 'DISPUTED') NULL,
    `newStatus` ENUM('SEARCHING_MOTOBOY', 'ACCEPTED', 'MOTOBOY_TO_PICKUP', 'ARRIVED_AT_PICKUP', 'PICKED_UP', 'IN_DELIVERY', 'COMPLETED', 'CANCELLED_BY_COMPANY', 'CANCELLED_BY_MOTOBOY', 'EXPIRED', 'DISPUTED') NOT NULL,
    `actorUserId` CHAR(36) NULL,
    `actorRole` ENUM('MOTOBOY', 'COMPANY', 'ADMIN') NULL,
    `note` VARCHAR(300) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `delivery_status_history_deliveryId_createdAt_idx`(`deliveryId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ratings` (
    `id` CHAR(36) NOT NULL,
    `deliveryId` CHAR(36) NOT NULL,
    `reviewerUserId` CHAR(36) NOT NULL,
    `reviewedUserId` CHAR(36) NOT NULL,
    `reviewerRole` ENUM('MOTOBOY', 'COMPANY', 'ADMIN') NOT NULL,
    `score` SMALLINT NOT NULL,
    `comment` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ratings_reviewedUserId_createdAt_idx`(`reviewedUserId`, `createdAt`),
    INDEX `ratings_reviewerUserId_createdAt_idx`(`reviewerUserId`, `createdAt`),
    UNIQUE INDEX `ratings_deliveryId_reviewerUserId_key`(`deliveryId`, `reviewerUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `favorites` (
    `id` CHAR(36) NOT NULL,
    `companyId` CHAR(36) NOT NULL,
    `motoboyId` CHAR(36) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `favorites_motoboyId_idx`(`motoboyId`),
    UNIQUE INDEX `favorites_companyId_motoboyId_key`(`companyId`, `motoboyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reports` (
    `id` CHAR(36) NOT NULL,
    `reporterUserId` CHAR(36) NOT NULL,
    `reportedUserId` CHAR(36) NULL,
    `deliveryId` CHAR(36) NULL,
    `category` ENUM('USER_NO_SHOW', 'FRAUD_ATTEMPT', 'INAPPROPRIATE_BEHAVIOR', 'PAYMENT_PROBLEM', 'THREAT', 'ACCIDENT', 'IRREGULAR_ORDER', 'OTHER') NOT NULL,
    `description` VARCHAR(1500) NOT NULL,
    `fingerprint` CHAR(64) NOT NULL,
    `status` ENUM('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED') NOT NULL DEFAULT 'OPEN',
    `adminNotes` VARCHAR(2000) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `reports_reporterUserId_createdAt_idx`(`reporterUserId`, `createdAt`),
    INDEX `reports_reportedUserId_status_idx`(`reportedUserId`, `status`),
    INDEX `reports_deliveryId_idx`(`deliveryId`),
    INDEX `reports_status_createdAt_idx`(`status`, `createdAt`),
    UNIQUE INDEX `reports_reporterUserId_fingerprint_key`(`reporterUserId`, `fingerprint`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `admin_actions` (
    `id` CHAR(36) NOT NULL,
    `adminUserId` CHAR(36) NOT NULL,
    `targetUserId` CHAR(36) NULL,
    `actionType` ENUM('USER_ACTIVATED', 'USER_SUSPENDED', 'USER_BANNED', 'USER_REACTIVATED', 'REPORT_STATUS_CHANGED', 'PRICING_RULE_CHANGED', 'SUBSCRIPTION_PLAN_CHANGED') NOT NULL,
    `reason` VARCHAR(1000) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `admin_actions_adminUserId_createdAt_idx`(`adminUserId`, `createdAt`),
    INDEX `admin_actions_targetUserId_createdAt_idx`(`targetUserId`, `createdAt`),
    INDEX `admin_actions_actionType_createdAt_idx`(`actionType`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `terms_acceptances` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `version` VARCHAR(40) NOT NULL,
    `acceptedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `terms_acceptances_version_idx`(`version`),
    UNIQUE INDEX `terms_acceptances_userId_version_key`(`userId`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `privacy_acceptances` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `version` VARCHAR(40) NOT NULL,
    `acceptedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `privacy_acceptances_version_idx`(`version`),
    UNIQUE INDEX `privacy_acceptances_userId_version_key`(`userId`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `legal_acceptances` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `documentType` ENUM('TERMS_OF_USE', 'PRIVACY_POLICY') NOT NULL,
    `documentVersion` VARCHAR(40) NOT NULL,
    `acceptedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `metadata` JSON NULL,

    INDEX `legal_acceptances_documentType_documentVersion_idx`(`documentType`, `documentVersion`),
    UNIQUE INDEX `legal_acceptances_userId_documentType_documentVersion_key`(`userId`, `documentType`, `documentVersion`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `account_closures` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `requestedAt` DATETIME(3) NOT NULL,
    `processedAt` DATETIME(3) NOT NULL,
    `retainedData` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `account_closures_userId_key`(`userId`),
    INDEX `account_closures_processedAt_idx`(`processedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `type` ENUM('NEW_OPPORTUNITY', 'DELIVERY_ACCEPTED', 'DELIVERY_STATUS_CHANGED', 'DELIVERY_CANCELLED', 'DELIVERY_COMPLETED', 'REPORT_UPDATED', 'ADMIN_NOTICE') NOT NULL,
    `title` VARCHAR(120) NOT NULL,
    `message` VARCHAR(500) NOT NULL,
    `readAt` DATETIME(3) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notifications_userId_readAt_createdAt_idx`(`userId`, `readAt`, `createdAt`),
    INDEX `notifications_userId_createdAt_idx`(`userId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sessions` (
    `id` CHAR(36) NOT NULL,
    `tokenHash` CHAR(64) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `lastSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `revokedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `sessions_tokenHash_key`(`tokenHash`),
    INDEX `sessions_userId_idx`(`userId`),
    INDEX `sessions_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auth_throttles` (
    `keyHash` CHAR(64) NOT NULL,
    `failedAttempts` INTEGER NOT NULL DEFAULT 0,
    `windowStartedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `blockedUntil` DATETIME(3) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `auth_throttles_blockedUntil_idx`(`blockedUntil`),
    PRIMARY KEY (`keyHash`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `pre_registrations` ADD CONSTRAINT `pre_registrations_convertedUserId_fkey` FOREIGN KEY (`convertedUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `subscription_plans`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subscription_events` ADD CONSTRAINT `subscription_events_subscriptionId_fkey` FOREIGN KEY (`subscriptionId`) REFERENCES `subscriptions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `motoboy_profiles` ADD CONSTRAINT `motoboy_profiles_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `company_profiles` ADD CONSTRAINT `company_profiles_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `company_locations` ADD CONSTRAINT `company_locations_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `company_profiles`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `deliveries` ADD CONSTRAINT `deliveries_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `company_profiles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `deliveries` ADD CONSTRAINT `deliveries_motoboyId_fkey` FOREIGN KEY (`motoboyId`) REFERENCES `motoboy_profiles`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `deliveries` ADD CONSTRAINT `deliveries_pickupLocationId_fkey` FOREIGN KEY (`pickupLocationId`) REFERENCES `company_locations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `deliveries` ADD CONSTRAINT `deliveries_pricingRuleId_fkey` FOREIGN KEY (`pricingRuleId`) REFERENCES `pricing_rules`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `delivery_extras` ADD CONSTRAINT `delivery_extras_deliveryId_fkey` FOREIGN KEY (`deliveryId`) REFERENCES `deliveries`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `delivery_extras` ADD CONSTRAINT `delivery_extras_informedByUserId_fkey` FOREIGN KEY (`informedByUserId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `delivery_extra_history` ADD CONSTRAINT `delivery_extra_history_extraId_fkey` FOREIGN KEY (`extraId`) REFERENCES `delivery_extras`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `delivery_extra_history` ADD CONSTRAINT `delivery_extra_history_actorUserId_fkey` FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `delivery_status_history` ADD CONSTRAINT `delivery_status_history_deliveryId_fkey` FOREIGN KEY (`deliveryId`) REFERENCES `deliveries`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ratings` ADD CONSTRAINT `ratings_deliveryId_fkey` FOREIGN KEY (`deliveryId`) REFERENCES `deliveries`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ratings` ADD CONSTRAINT `ratings_reviewerUserId_fkey` FOREIGN KEY (`reviewerUserId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `ratings` ADD CONSTRAINT `ratings_reviewedUserId_fkey` FOREIGN KEY (`reviewedUserId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `favorites` ADD CONSTRAINT `favorites_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `company_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `favorites` ADD CONSTRAINT `favorites_motoboyId_fkey` FOREIGN KEY (`motoboyId`) REFERENCES `motoboy_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reports` ADD CONSTRAINT `reports_reporterUserId_fkey` FOREIGN KEY (`reporterUserId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reports` ADD CONSTRAINT `reports_reportedUserId_fkey` FOREIGN KEY (`reportedUserId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reports` ADD CONSTRAINT `reports_deliveryId_fkey` FOREIGN KEY (`deliveryId`) REFERENCES `deliveries`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `admin_actions` ADD CONSTRAINT `admin_actions_adminUserId_fkey` FOREIGN KEY (`adminUserId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `admin_actions` ADD CONSTRAINT `admin_actions_targetUserId_fkey` FOREIGN KEY (`targetUserId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `terms_acceptances` ADD CONSTRAINT `terms_acceptances_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `privacy_acceptances` ADD CONSTRAINT `privacy_acceptances_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `legal_acceptances` ADD CONSTRAINT `legal_acceptances_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `account_closures` ADD CONSTRAINT `account_closures_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Integrity constraints preserved from the PostgreSQL implementation.
-- Hostinger must provide MySQL 8.0.16+ so CHECK constraints are enforced.
ALTER TABLE `company_locations`
  ADD CONSTRAINT `company_locations_state_check`
    CHECK (`state` IN ('PE', 'BA')),
  ADD CONSTRAINT `company_locations_city_state_check`
    CHECK (
      (`city` = 'PETROLINA_PE' AND `state` = 'PE') OR
      (`city` = 'JUAZEIRO_BA' AND `state` = 'BA')
    ),
  ADD CONSTRAINT `company_locations_latitude_check`
    CHECK (`latitude` IS NULL OR `latitude` BETWEEN -90 AND 90),
  ADD CONSTRAINT `company_locations_longitude_check`
    CHECK (`longitude` IS NULL OR `longitude` BETWEEN -180 AND 180);

ALTER TABLE `motoboy_profiles`
  ADD CONSTRAINT `motoboy_profiles_location_pair_check`
    CHECK (
      (`lastLocationAt` IS NULL AND `lastLatitude` IS NULL AND `lastLongitude` IS NULL) OR
      (`lastLocationAt` IS NOT NULL AND `lastLatitude` IS NOT NULL AND `lastLongitude` IS NOT NULL)
    ),
  ADD CONSTRAINT `motoboy_profiles_latitude_check`
    CHECK (`lastLatitude` IS NULL OR `lastLatitude` BETWEEN -90 AND 90),
  ADD CONSTRAINT `motoboy_profiles_longitude_check`
    CHECK (`lastLongitude` IS NULL OR `lastLongitude` BETWEEN -180 AND 180),
  ADD CONSTRAINT `motoboy_profiles_online_since_check`
    CHECK (`isOnline` = false OR (`onlineSince` IS NOT NULL AND `lastLocationAt` IS NOT NULL));

ALTER TABLE `deliveries`
  ADD CONSTRAINT `deliveries_pickup_latitude_check`
    CHECK (`pickupLatitude` BETWEEN -90 AND 90),
  ADD CONSTRAINT `deliveries_pickup_longitude_check`
    CHECK (`pickupLongitude` BETWEEN -180 AND 180),
  ADD CONSTRAINT `deliveries_destination_latitude_check`
    CHECK (`destinationLatitude` BETWEEN -90 AND 90),
  ADD CONSTRAINT `deliveries_destination_longitude_check`
    CHECK (`destinationLongitude` BETWEEN -180 AND 180),
  ADD CONSTRAINT `deliveries_offered_price_check`
    CHECK (`offeredPrice` > 0),
  ADD CONSTRAINT `deliveries_distance_check`
    CHECK (`distanceEstimateKm` >= 0),
  ADD CONSTRAINT `deliveries_acceptance_check`
    CHECK (
      (`status` = 'SEARCHING_MOTOBOY' AND `motoboyId` IS NULL AND `acceptedAt` IS NULL) OR
      (`status` <> 'SEARCHING_MOTOBOY')
    );

ALTER TABLE `ratings`
  ADD CONSTRAINT `ratings_score_check` CHECK (`score` BETWEEN 1 AND 5),
  ADD CONSTRAINT `ratings_users_check` CHECK (`reviewerUserId` <> `reviewedUserId`);

ALTER TABLE `pricing_rules`
  ADD CONSTRAINT `pricing_rules_non_negative_check`
    CHECK (`basePrice` >= 0 AND `pricePerKm` >= 0 AND `minimumPrice` >= 0),
  ADD CONSTRAINT `pricing_rules_period_check`
    CHECK (`activeTo` IS NULL OR `activeTo` > `activeFrom`);

ALTER TABLE `subscription_plans`
  ADD CONSTRAINT `subscription_plans_price_check` CHECK (`monthlyPrice` >= 0),
  ADD CONSTRAINT `subscription_plans_trial_check` CHECK (`trialDays` BETWEEN 0 AND 365),
  ADD CONSTRAINT `subscription_plans_role_check` CHECK (`role` IN ('MOTOBOY', 'COMPANY'));

ALTER TABLE `subscriptions`
  ADD CONSTRAINT `subscriptions_price_check` CHECK (`monthlyPrice` >= 0);

-- MySQL has no partial unique indexes. Nullable keys maintained atomically by
-- the repositories preserve the same invariants because UNIQUE permits NULLs.
ALTER TABLE `company_locations`
  ADD COLUMN `defaultCompanyKey` CHAR(36) NULL,
  ADD UNIQUE INDEX `company_locations_one_default_per_company_idx` (`defaultCompanyKey`);

ALTER TABLE `deliveries`
  ADD COLUMN `activeMotoboyKey` CHAR(36) NULL,
  ADD UNIQUE INDEX `deliveries_one_active_per_motoboy_idx` (`activeMotoboyKey`);

ALTER TABLE `subscriptions`
  ADD COLUMN `openSubscriptionUserKey` CHAR(36) NULL,
  ADD UNIQUE INDEX `subscriptions_one_open_per_user_key` (`openSubscriptionUserKey`);

-- Provisional records required by the existing pricing/subscription modules.
INSERT INTO `pricing_rules` (
  `id`, `city`, `basePrice`, `pricePerKm`, `minimumPrice`,
  `enabled`, `activeFrom`, `createdAt`, `updatedAt`
) VALUES
  ('14000000-0000-4000-8000-000000000001', 'PETROLINA_PE', 8.00, 2.00, 12.00, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('14000000-0000-4000-8000-000000000002', 'JUAZEIRO_BA', 8.00, 2.00, 12.00, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));

INSERT INTO `subscription_plans` (
  `id`, `role`, `name`, `description`, `monthlyPrice`,
  `active`, `trialDays`, `createdAt`, `updatedAt`
) VALUES
  ('15000000-0000-4000-8000-000000000001', 'MOTOBOY', 'Motoboy', 'Acesso às oportunidades e organização do histórico.', 20.00, true, 0, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('15000000-0000-4000-8000-000000000002', 'COMPANY', 'Empresa', 'Publicação e acompanhamento organizado das entregas locais.', 25.00, true, 0, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));
