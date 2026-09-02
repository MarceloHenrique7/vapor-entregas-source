import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const readProjectFile = (path: string) =>
  readFileSync(join(process.cwd(), path), "utf8");

describe("Payment Brick checkout UI", () => {
  it("uses the official Mercado Pago Payment Brick with Pix and credit card", () => {
    const source = readProjectFile(
      "src/components/subscriptions/mercado-pago-payment-brick.tsx",
    );

    expect(source).toContain(
      'import { initMercadoPago, Payment } from "@mercadopago/sdk-react"',
    );
    expect(source).toContain("<Payment");
    expect(source).toContain('creditCard: "all"');
    expect(source).toContain('bankTransfer: ["pix"]');
    expect(source).not.toMatch(
      /cardForm|cardNumber|expirationDate|securityCode/,
    );
  });

  it("opens the Payment Brick from the shared company and motoboy dashboard", () => {
    const dashboard = readProjectFile(
      "src/components/subscriptions/subscription-dashboard.tsx",
    );
    const companyPage = readProjectFile(
      "src/app/app/empresa/assinatura/page.tsx",
    );
    const motoboyPage = readProjectFile(
      "src/app/app/motoboy/assinatura/page.tsx",
    );

    expect(dashboard).toContain("<MercadoPagoPaymentBrick");
    expect(dashboard).toContain('title="Escolha como pagar"');
    expect(dashboard).toContain('"Ativar plano"');
    expect(dashboard).toContain('"Renovar acesso"');
    expect(dashboard).toContain('"Renovar por mais 30 dias"');
    expect(dashboard).not.toMatch(
      /Autorizar assinatura|cobrança mensal recorrente|Próxima cobrança/,
    );
    expect(companyPage).toContain("<SubscriptionDashboard");
    expect(motoboyPage).toContain("<SubscriptionDashboard");
  });

  it("routes the active checkout through one-off payments", () => {
    const checkoutRoute = readProjectFile(
      "src/app/api/subscriptions/checkout/route.ts",
    );

    expect(checkoutRoute).toContain("createAccessPayment");
    expect(checkoutRoute).not.toMatch(/startSubscription|preapproval/);
  });

  it("keeps recurring plan creation and reactivation disabled", () => {
    const planSyncRoute = readProjectFile(
      "src/app/api/admin/subscription-plans/sync/route.ts",
    );
    const reactivateRoute = readProjectFile(
      "src/app/api/subscriptions/reactivate/route.ts",
    );

    expect(planSyncRoute).toContain("status: 410");
    expect(reactivateRoute).toContain("status: 410");
    expect(reactivateRoute).not.toMatch(
      /reactivateMySubscription|mercadoPagoSubscriptionProvider/,
    );
  });
});
