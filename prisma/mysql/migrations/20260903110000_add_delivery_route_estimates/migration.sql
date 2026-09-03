-- Extend the existing delivery estimate without duplicating distance storage.
ALTER TABLE `deliveries`
  MODIFY `distanceMethod` ENUM('STRAIGHT_LINE', 'GOOGLE_ROUTES') NOT NULL DEFAULT 'STRAIGHT_LINE',
  ADD COLUMN `routeDurationSeconds` INTEGER NULL AFTER `distanceMethod`,
  ADD COLUMN `routeCalculatedAt` DATETIME(3) NULL AFTER `routeDurationSeconds`;

ALTER TABLE `deliveries`
  ADD CONSTRAINT `deliveries_route_duration_check`
    CHECK (`routeDurationSeconds` IS NULL OR `routeDurationSeconds` >= 0);
