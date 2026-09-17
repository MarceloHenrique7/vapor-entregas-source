-- Companies no longer purchase access plans. Keep the row and all related
-- history intact so existing foreign keys, payments and audit records remain valid.
UPDATE `subscription_plans`
SET
  `active` = false,
  `trialDays` = 0,
  `updatedAt` = CURRENT_TIMESTAMP(3)
WHERE `role` = 'COMPANY';
