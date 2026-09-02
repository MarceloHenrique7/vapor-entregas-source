-- Payment Brick creates the idempotent local attempt before contacting Mercado
-- Pago. Keep requiring provider correlation for confirmed payments, while
-- allowing a CREATED/ERROR attempt to exist before providerPaymentId is known.
ALTER TABLE `subscription_payments`
  DROP CONSTRAINT `subscription_payments_provider_id_check`,
  ADD CONSTRAINT `subscription_payments_provider_id_check`
    CHECK (
      `providerAuthorizedPaymentId` IS NOT NULL
      OR `providerPaymentId` IS NOT NULL
      OR (
        `externalReference` IS NOT NULL
        AND `idempotencyKey` IS NOT NULL
        AND `status` IN ('CREATED', 'ERROR')
      )
    );
