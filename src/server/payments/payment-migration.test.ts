import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("Payment Brick database constraint", () => {
  it("allows an idempotent local attempt before Mercado Pago returns its ID", () => {
    const migration = readFileSync(
      join(
        process.cwd(),
        "prisma/mysql/migrations/20260902230500_allow_local_payment_attempts/migration.sql",
      ),
      "utf8",
    );

    expect(migration).toContain(
      "DROP CONSTRAINT `subscription_payments_provider_id_check`",
    );
    expect(migration).toContain("`externalReference` IS NOT NULL");
    expect(migration).toContain("`idempotencyKey` IS NOT NULL");
    expect(migration).toContain("`status` IN ('CREATED', 'ERROR')");
  });
});
