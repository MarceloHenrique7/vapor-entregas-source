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

  it("opens the Payment Brick only from the motoboy dashboard and keeps company checkout disabled", () => {
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
    expect(companyPage).toContain("<CompanySubscriptionDashboard");
    expect(companyPage).not.toContain("<SubscriptionDashboard");
    expect(motoboyPage).toContain("<SubscriptionDashboard");
  });

  it("keeps a non-billable company plan page and removes company checkout from registration", () => {
    const navigation = readProjectFile(
      "src/components/dashboard/navigation.ts",
    );
    const registration = readProjectFile(
      "src/server/registration/prisma-registration-repository.ts",
    );
    const deliveries = readProjectFile("src/app/api/deliveries/route.ts");
    const checkout = readProjectFile(
      "src/app/api/subscriptions/checkout/route.ts",
    );
    const migration = readProjectFile(
      "prisma/mysql/migrations/20260914150000_disable_company_subscription_plan/migration.sql",
    );

    expect(navigation).toContain('href: "/app/empresa/assinatura"');
    expect(registration).not.toContain('where: { role: "COMPANY" }');
    expect(registration).toContain('where: { role: "MOTOBOY" }');
    expect(deliveries).not.toContain("assertOperationalSubscription");
    expect(checkout).toContain('requireRole(["MOTOBOY"])');
    expect(checkout).not.toContain('"COMPANY"');
    expect(migration).toContain("WHERE `role` = 'COMPANY'");
    expect(migration).toContain("`active` = false");
  });

  it("keeps the payment action reachable in a viewport-limited dialog", () => {
    const dialog = readProjectFile("src/components/ui/dialog.tsx");

    expect(dialog).toContain("max-h-[calc(100dvh-1rem)]");
    expect(dialog).toContain("sm:max-h-[calc(100dvh-3rem)]");
    expect(dialog).toContain(
      "min-h-0 flex-1 overflow-y-auto overscroll-contain",
    );
    expect(dialog).toContain('document.body.style.overflow = "hidden"');
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
