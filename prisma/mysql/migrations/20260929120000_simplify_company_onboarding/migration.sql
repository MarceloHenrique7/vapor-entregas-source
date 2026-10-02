-- Preserve existing data while allowing the minimum company onboarding flow.
ALTER TABLE `users`
  MODIFY `email` VARCHAR(254) NULL;

ALTER TABLE `company_profiles`
  MODIFY `documentType` ENUM('CPF', 'CNPJ') NULL,
  MODIFY `legalDocumentEncrypted` TEXT NULL,
  MODIFY `legalDocumentHash` CHAR(64) NULL,
  MODIFY `legalDocumentLastDigits` CHAR(4) NULL,
  MODIFY `city` ENUM('PETROLINA_PE', 'JUAZEIRO_BA') NULL;
