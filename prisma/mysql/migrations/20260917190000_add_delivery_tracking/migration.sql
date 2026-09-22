-- Additive, privacy-minimized tracking: one link and only the latest position
-- per delivery. Raw bearer tokens are encrypted; lookups use the SHA-256 hash.

CREATE TABLE `delivery_tracking` (
  `id` CHAR(36) NOT NULL,
  `deliveryId` CHAR(36) NOT NULL,
  `tokenHash` CHAR(64) NOT NULL,
  `tokenEncrypted` TEXT NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `revokedAt` DATETIME(3) NULL,
  `lastLatitude` DECIMAL(9, 6) NULL,
  `lastLongitude` DECIMAL(9, 6) NULL,
  `lastAccuracyMeters` DECIMAL(8, 2) NULL,
  `lastLocationAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `delivery_tracking_deliveryId_key` (`deliveryId`),
  UNIQUE INDEX `delivery_tracking_tokenHash_key` (`tokenHash`),
  INDEX `delivery_tracking_expiresAt_revokedAt_idx` (`expiresAt`, `revokedAt`),
  INDEX `delivery_tracking_lastLocationAt_idx` (`lastLocationAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `delivery_tracking_deliveryId_fkey`
    FOREIGN KEY (`deliveryId`) REFERENCES `deliveries` (`id`)
    ON DELETE CASCADE ON UPDATE RESTRICT
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
