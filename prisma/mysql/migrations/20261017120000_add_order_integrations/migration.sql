-- Optional order-import integrations. Secrets and customer contact are
-- encrypted by the application before persistence.
CREATE TABLE `integration_connections` (
  `id` CHAR(36) NOT NULL,
  `companyId` CHAR(36) NOT NULL,
  `provider` ENUM('GENERIC_WEBHOOK', 'MANUAL_CSV', 'IFOOD') NOT NULL,
  `status` ENUM('NOT_CONNECTED', 'CONNECTED', 'AWAITING_AUTHORIZATION', 'UNAVAILABLE', 'REVOKED') NOT NULL DEFAULT 'NOT_CONNECTED',
  `displayName` VARCHAR(100) NOT NULL,
  `keyPrefix` VARCHAR(24) NULL,
  `secretEncrypted` TEXT NULL,
  `secretHash` CHAR(64) NULL,
  `config` JSON NULL,
  `connectedAt` DATETIME(3) NULL,
  `revokedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `integration_connections_keyPrefix_key`(`keyPrefix`),
  UNIQUE INDEX `integration_connections_companyId_provider_key`(`companyId`, `provider`),
  INDEX `integration_connections_companyId_status_idx`(`companyId`, `status`),
  PRIMARY KEY (`id`),
  CONSTRAINT `integration_connections_companyId_fkey`
    FOREIGN KEY (`companyId`) REFERENCES `company_profiles`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `integration_events` (
  `id` CHAR(36) NOT NULL,
  `connectionId` CHAR(36) NOT NULL,
  `externalEventId` VARCHAR(191) NOT NULL,
  `eventType` VARCHAR(100) NOT NULL,
  `occurredAt` DATETIME(3) NULL,
  `payloadHash` CHAR(64) NOT NULL,
  `status` ENUM('RECEIVED', 'PROCESSED', 'REJECTED', 'FAILED') NOT NULL DEFAULT 'RECEIVED',
  `errorCode` VARCHAR(80) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `integration_events_connectionId_externalEventId_key`(`connectionId`, `externalEventId`),
  INDEX `integration_events_connectionId_createdAt_idx`(`connectionId`, `createdAt`),
  INDEX `integration_events_status_createdAt_idx`(`status`, `createdAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `integration_events_connectionId_fkey`
    FOREIGN KEY (`connectionId`) REFERENCES `integration_connections`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `imported_orders` (
  `id` CHAR(36) NOT NULL,
  `companyId` CHAR(36) NOT NULL,
  `connectionId` CHAR(36) NULL,
  `provider` ENUM('GENERIC_WEBHOOK', 'MANUAL_CSV', 'IFOOD') NOT NULL,
  `externalId` VARCHAR(191) NOT NULL,
  `channel` VARCHAR(80) NOT NULL,
  `externalStatus` VARCHAR(80) NULL,
  `externalCreatedAt` DATETIME(3) NULL,
  `lastEventAt` DATETIME(3) NULL,
  `logisticsMode` VARCHAR(80) NULL,
  `eligibleForOwnDelivery` BOOLEAN NOT NULL DEFAULT false,
  `destinationAddress` VARCHAR(180) NULL,
  `destinationNumber` VARCHAR(20) NULL,
  `destinationNeighborhood` VARCHAR(100) NULL,
  `destinationComplement` VARCHAR(120) NULL,
  `destinationReference` VARCHAR(180) NULL,
  `destinationPhoneEncrypted` TEXT NULL,
  `destinationCity` ENUM('PETROLINA_PE', 'JUAZEIRO_BA') NULL,
  `destinationState` CHAR(2) NULL,
  `destinationPostalCode` VARCHAR(9) NULL,
  `notes` VARCHAR(500) NULL,
  `status` ENUM('IMPORTED', 'READY', 'CONVERTED', 'IGNORED', 'INVALID') NOT NULL DEFAULT 'IMPORTED',
  `metadata` JSON NULL,
  `deliveryId` CHAR(36) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `imported_orders_deliveryId_key`(`deliveryId`),
  UNIQUE INDEX `imported_orders_companyId_provider_externalId_key`(`companyId`, `provider`, `externalId`),
  INDEX `imported_orders_companyId_status_createdAt_idx`(`companyId`, `status`, `createdAt`),
  INDEX `imported_orders_companyId_provider_createdAt_idx`(`companyId`, `provider`, `createdAt`),
  INDEX `imported_orders_connectionId_createdAt_idx`(`connectionId`, `createdAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `imported_orders_companyId_fkey`
    FOREIGN KEY (`companyId`) REFERENCES `company_profiles`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `imported_orders_connectionId_fkey`
    FOREIGN KEY (`connectionId`) REFERENCES `integration_connections`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `imported_orders_deliveryId_fkey`
    FOREIGN KEY (`deliveryId`) REFERENCES `deliveries`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
