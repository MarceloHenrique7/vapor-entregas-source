-- Optional customer contact supplied by the company. It is encrypted by the
-- application before persistence and only returned to delivery participants.
ALTER TABLE `deliveries`
  ADD COLUMN `destinationPhoneEncrypted` TEXT NULL AFTER `destinationReference`;
