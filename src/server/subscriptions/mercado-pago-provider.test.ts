import { createHash } from "node:crypto";

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/server/config/env", () => ({
  getSubscriptionEnv: () => ({
    NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY: "TEST-1234567890-public-key-not-real",
    MERCADO_PAGO_ACCESS_TOKEN: "TEST-1234567890-access-token-not-a-real-secret",
    MERCADO_PAGO_API_BASE_URL: "https://api.mercadopago.test",
    MERCADO_PAGO_MODE: "test",
  }),
}));

import { SubscriptionProviderError } from "./errors";
import { MercadoPagoSubscriptionProvider } from "./mercado-pago-provider";

const planBody = {
  id: "provider-plan-1",
  application_id: 1234567890,
  collector_id: 987654321,
  reason: "Vapor Entregas - Plano Motoboy",
  status: "active",
  back_url: "https://app.example.test/app/motoboy/assinatura/retorno",
  auto_recurring: {
    frequency: 1,
    frequency_type: "months",
    transaction_amount: 19.9,
    currency_id: "BRL",
  },
};
const subscriptionBody = {
  id: "preapproval-1",
  status: "authorized",
  external_reference: "subscription:local-subscription-1",
  preapproval_plan_id: "provider-plan-1",
};

describe("adapter oficial de Assinaturas do Mercado Pago", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, "info").mockImplementation(() => undefined);
  });

  it("cria plano mensal BRL com idempotencia", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify(planBody)));
    const result = await new MercadoPagoSubscriptionProvider().createPlan({
      idempotencyKey: "plan:test:internal:19.90",
      reason: planBody.reason,
      monthlyPrice: 19.9,
      trialDays: 0,
      backUrl: planBody.back_url,
    });
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://api.mercadopago.test/preapproval_plan",
    );
    expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({
      "X-Idempotency-Key": "plan:test:internal:19.90",
    });
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toMatchObject({
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: 19.9,
        currency_id: "BRL",
      },
    });
    expect(result).toMatchObject({
      applicationId: "1234567890",
      collectorId: "987654321",
      belongsToCurrentApplication: true,
    });
  });

  it("consulta o plano e registra somente diagnostico sanitizado", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(planBody)),
    );

    await expect(
      new MercadoPagoSubscriptionProvider().getPlan("provider-plan-1"),
    ).resolves.toMatchObject({
      applicationId: "1234567890",
      collectorId: "987654321",
      belongsToCurrentApplication: true,
    });

    const diagnostic = JSON.parse(
      String(vi.mocked(console.info).mock.calls[0]?.[0]),
    ) as Record<string, unknown>;
    expect(diagnostic).toMatchObject({
      scope: "api.subscriptions.plan-diagnostic",
      providerPlanIdPresent: true,
      providerPlanIdMasked: "provid***an-1",
      lookupStatus: 200,
      planFound: true,
      planStatus: "active",
      applicationIdPresent: true,
      collectorIdPresent: true,
    });
    const serialized = JSON.stringify(diagnostic);
    expect(serialized).not.toContain("provider-plan-1");
    expect(serialized).not.toContain("987654321");
  });

  it("registra GET de plano inexistente sem expor o ID", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ message: "Resource not found" }), {
        status: 400,
      }),
    );

    await expect(
      new MercadoPagoSubscriptionProvider().getPlan("missing-plan-secret"),
    ).rejects.toMatchObject({
      providerStatus: 400,
      providerMessage: "Resource not found",
    });

    const diagnostic = JSON.parse(
      String(vi.mocked(console.info).mock.calls[0]?.[0]),
    ) as Record<string, unknown>;
    expect(diagnostic).toMatchObject({
      scope: "api.subscriptions.plan-diagnostic",
      providerPlanIdPresent: true,
      providerPlanIdMasked: "missin***cret",
      lookupStatus: 400,
      planFound: false,
      planStatus: null,
      applicationIdPresent: false,
      collectorIdPresent: false,
    });
    expect(JSON.stringify(diagnostic)).not.toContain("missing-plan-secret");
  });

  it("busca planos pelo endpoint oficial sem mutação", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(
          JSON.stringify({ paging: { total: 1 }, results: [planBody] }),
        ),
      );

    await expect(
      new MercadoPagoSubscriptionProvider().searchPlans(),
    ).resolves.toEqual([
      expect.objectContaining({
        id: "provider-plan-1",
        status: "active",
      }),
    ]);
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://api.mercadopago.test/preapproval_plan/search",
    );
    expect(fetchMock.mock.calls[0][1]?.method).toBeUndefined();
  });

  it("resolve vendedor, site e tipo de conta pelo Access Token", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 987654321,
          email: "seller@example.test",
          site_id: "MLB",
          test_user: true,
        }),
      ),
    );

    await expect(
      new MercadoPagoSubscriptionProvider().getSellerAccount(),
    ).resolves.toEqual({
      id: "987654321",
      email: "seller@example.test",
      siteId: "MLB",
      testUser: true,
    });
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://api.mercadopago.test/users/me",
    );
  });

  it("cria preapproval autorizado com o token gerado pelo SDK", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (input) =>
        String(input).includes("/users/")
          ? new Response(
              JSON.stringify({
                id: 987654321,
                email: "seller@example.test",
                site_id: "MLB",
                test_user: true,
              }),
            )
          : new Response(JSON.stringify(subscriptionBody)),
      );
    await expect(
      new MercadoPagoSubscriptionProvider().createAuthorized({
        providerPlanId: "provider-plan-1",
        sellerAccountId: "987654321",
        cardTokenId: "card-token-valid-1234567890",
        clientDiagnostics: {
          publicKeyConfigured: true,
          publicKeyEnvironment: "test",
          publicKeyHash: createHash("sha256")
            .update("TEST-1234567890-public-key-not-real")
            .digest("hex"),
        },
        externalReference: "subscription:local-subscription-1",
        payerEmail: "payer@example.test",
        payerEmailMatchesLoggedUser: true,
        reason: "Plano mensal",
        backUrl: "https://app.example.test/app/motoboy/assinatura/retorno",
        notificationUrl:
          "https://app.example.test/api/webhooks/mercadopago?source_news=webhooks",
      }),
    ).resolves.toMatchObject({
      id: "preapproval-1",
      planId: "provider-plan-1",
    });
    const preapprovalCall = fetchMock.mock.calls.find(([url]) =>
      String(url).endsWith("/preapproval"),
    );
    const sent = JSON.parse(String(preapprovalCall?.[1]?.body));
    expect(sent).toMatchObject({
      preapproval_plan_id: "provider-plan-1",
      card_token_id: "card-token-valid-1234567890",
      payer_email: "payer@example.test",
      external_reference: "subscription:local-subscription-1",
      status: "authorized",
      notification_url:
        "https://app.example.test/api/webhooks/mercadopago?source_news=webhooks",
    });
    expect(sent).not.toHaveProperty("transaction_amount");
    expect(sent).not.toHaveProperty("card_number");
    expect(sent).not.toHaveProperty("security_code");

    const diagnostic = JSON.parse(
      String(vi.mocked(console.info).mock.calls[0]?.[0]),
    ) as Record<string, unknown>;
    expect(diagnostic).toMatchObject({
      scope: "api.subscriptions.credential-diagnostic",
      mode: "test",
      publicKeyConfigured: true,
      accessTokenConfigured: true,
      publicKeyPrefix: "TEST",
      accessTokenPrefix: "TEST",
      publicKeyEnvironment: "test",
      accessTokenEnvironment: "test",
      publicKeyBuildMatchesRuntime: true,
      publicKeyApplicationIdPresent: true,
      accessTokenApplicationIdPresent: true,
      credentialApplicationIdsMatch: true,
      sellerAccountResolved: true,
      sellerSiteId: "MLB",
      sellerTestUser: true,
      planCollectorMatchesSeller: true,
      cardTokenIdPresent: true,
      preapprovalPlanIdPresent: true,
    });
    const serializedDiagnostic = JSON.stringify(diagnostic);
    expect(serializedDiagnostic).not.toContain("public-key-not-real");
    expect(serializedDiagnostic).not.toContain(
      "access-token-not-a-real-secret",
    );
    expect(serializedDiagnostic).not.toContain("card-token-valid-1234567890");
    expect(serializedDiagnostic).not.toContain("provider-plan-1");

    const diagnostics = vi
      .mocked(console.info)
      .mock.calls.map(
        ([value]) => JSON.parse(String(value)) as Record<string, unknown>,
      );
    const payerDiagnostic = diagnostics.find(
      (value) => value.scope === "api.subscriptions.payer-diagnostic",
    );
    expect(payerDiagnostic).toMatchObject({
      mode: "test",
      sellerSiteId: "MLB",
      sellerSiteMatchesBrazil: true,
      payerEmailPresent: true,
      payerEmailDomain: "example.test",
      payerEmailMatchesLoggedUser: true,
      payerEmailMatchesSellerAccount: false,
      payerDifferentFromSeller: true,
      cardTokenIdPresent: true,
      preapprovalPlanIdPresent: true,
      status: "authorized",
    });
    const serializedPayerDiagnostic = JSON.stringify(payerDiagnostic);
    expect(serializedPayerDiagnostic).not.toContain("payer@example.test");
    expect(serializedPayerDiagnostic).not.toContain("seller@example.test");
    expect(serializedPayerDiagnostic).not.toContain("987654321");

    const payloadDiagnostic = diagnostics.find(
      (value) =>
        value.scope === "api.subscriptions.preapproval-payload-diagnostic",
    );
    expect(payloadDiagnostic).toMatchObject({
      scope: "api.subscriptions.preapproval-payload-diagnostic",
      preapprovalPlanIdPresent: true,
      cardTokenIdPresent: true,
      payerEmailPresent: true,
      status: "authorized",
      autoRecurringPresent: false,
      backUrlPresent: true,
    });
    const serializedPayloadDiagnostic = JSON.stringify(payloadDiagnostic);
    expect(serializedPayloadDiagnostic).not.toContain("provider-plan-1");
    expect(serializedPayloadDiagnostic).not.toContain(
      "card-token-valid-1234567890",
    );
    expect(serializedPayloadDiagnostic).not.toContain("payer@example.test");
  });

  it("detecta Public Key antiga no bundle sem registrar a chave", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) =>
      String(input).endsWith("/users/me")
        ? new Response(
            JSON.stringify({
              id: 987654321,
              email: "seller@example.test",
              site_id: "MLB",
              test_user: true,
            }),
          )
        : new Response(JSON.stringify(subscriptionBody)),
    );
    await new MercadoPagoSubscriptionProvider().createAuthorized({
      providerPlanId: "provider-plan-1",
      sellerAccountId: null,
      cardTokenId: "card-token-valid-1234567890",
      clientDiagnostics: {
        publicKeyConfigured: true,
        publicKeyEnvironment: "test",
        publicKeyHash: createHash("sha256")
          .update("TEST-old-public-key-not-real")
          .digest("hex"),
      },
      externalReference: "subscription:local-subscription-1",
      payerEmail: "payer@example.test",
      payerEmailMatchesLoggedUser: true,
      reason: "Plano mensal",
      backUrl: "https://app.example.test/app/motoboy/assinatura/retorno",
      notificationUrl:
        "https://app.example.test/api/webhooks/mercadopago?source_news=webhooks",
    });

    const diagnostic = JSON.parse(
      String(vi.mocked(console.info).mock.calls[0]?.[0]),
    ) as Record<string, unknown>;
    expect(diagnostic.publicKeyBuildMatchesRuntime).toBe(false);
    expect(JSON.stringify(diagnostic)).not.toContain("old-public-key");
  });

  it("bloqueia plano pertencente a outro vendedor antes do preapproval", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 111111111,
          email: "seller@example.test",
          site_id: "MLB",
          test_user: true,
        }),
      ),
    );

    await expect(
      new MercadoPagoSubscriptionProvider().createAuthorized({
        providerPlanId: "provider-plan-1",
        sellerAccountId: "987654321",
        cardTokenId: "card-token-valid-1234567890",
        externalReference: "subscription:local-subscription-1",
        payerEmail: "payer@example.test",
        payerEmailMatchesLoggedUser: true,
        reason: "Plano mensal",
        backUrl: "https://app.example.test/app/motoboy/assinatura/retorno",
        notificationUrl:
          "https://app.example.test/api/webhooks/mercadopago?source_news=webhooks",
      }),
    ).rejects.toMatchObject({
      providerCode: "LOCAL_PLAN_COLLECTOR_MISMATCH",
      endpoint: "/preapproval",
      method: "POST",
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(String(fetchMock.mock.calls[0]?.[0])).toMatch(/\/users\/me$/);
  });

  it("configura sete dias de teste gratis no plano remoto", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          ...planBody,
          auto_recurring: {
            ...planBody.auto_recurring,
            free_trial: { frequency: 7, frequency_type: "days" },
          },
        }),
      ),
    );
    await expect(
      new MercadoPagoSubscriptionProvider().createPlan({
        idempotencyKey: "plan:test:internal:19.90:trial-7",
        reason: planBody.reason,
        monthlyPrice: 19.9,
        trialDays: 7,
        backUrl: planBody.back_url,
      }),
    ).resolves.toMatchObject({ trialDays: 7 });
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toMatchObject({
      auto_recurring: {
        free_trial: { frequency: 7, frequency_type: "days" },
      },
    });
  });

  it("consulta fatura e pagamento final sem persistir dados de cartao", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 100,
            preapproval_id: "preapproval-1",
            external_reference: "subscription:local-subscription-1",
            transaction_amount: "19.90",
            currency_id: "BRL",
            status: "processed",
            summarized: "approved",
            date_created: "2026-08-30T10:00:00.000Z",
            payment: { id: 200, status: "approved" },
          }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 200,
            status: "approved",
            transaction_amount: 19.9,
            currency_id: "BRL",
            date_created: "2026-08-30T10:00:00.000Z",
            date_approved: "2026-08-30T10:01:00.000Z",
            external_reference: "subscription:local-subscription-1",
          }),
        ),
      );
    const result =
      await new MercadoPagoSubscriptionProvider().getAuthorizedPayment("100");
    expect(result).toMatchObject({
      authorizedPaymentId: "100",
      paymentId: "200",
      subscriptionId: "preapproval-1",
      amount: 19.9,
      status: "approved",
    });
    expect(fetchMock.mock.calls[1][0]).toBe(
      "https://api.mercadopago.test/v1/payments/200",
    );
  });

  it("cancela com PUT e estado canceled", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(
          JSON.stringify({ ...subscriptionBody, status: "canceled" }),
        ),
      );
    await new MercadoPagoSubscriptionProvider().cancelSubscription(
      "preapproval-1",
    );
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      status: "canceled",
    });
  });

  it("preserva diagnostico de timeout, HTTP e resposta invalida no erro interno", async () => {
    const adapter = new MercadoPagoSubscriptionProvider();
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(
      new Error("token-secret"),
    );
    await expect(adapter.getSubscription("id")).rejects.toEqual(
      expect.objectContaining({
        constructor: SubscriptionProviderError,
        message: expect.not.stringContaining("token-secret"),
      }),
    );
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: 987654321,
          email: "seller@example.test",
          site_id: "MLB",
          test_user: true,
        }),
      ),
    );
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          message: "invalid preapproval payload",
          error: "bad_request",
          status: 400,
          cause: [{ code: 1234, description: "payer_email is invalid" }],
          access_token: "TEST-provider-private-token",
        }),
        { status: 400, headers: { "x-request-id": "provider-request-123" } },
      ),
    );
    await expect(
      adapter.createAuthorized({
        providerPlanId: "provider-plan-1",
        sellerAccountId: null,
        cardTokenId: "card-token-valid-1234567890",
        externalReference: "subscription:local-subscription-1",
        payerEmail: "payer@example.test",
        payerEmailMatchesLoggedUser: true,
        reason: "Plano mensal",
        backUrl: "https://app.example.test/app/motoboy/assinatura/retorno",
        notificationUrl:
          "https://app.example.test/api/webhooks/mercadopago?source_news=webhooks",
      }),
    ).rejects.toMatchObject({
      providerStatus: 400,
      providerCode: "bad_request",
      providerMessage: "invalid preapproval payload",
      providerCause: [{ code: 1234, description: "payer_email is invalid" }],
      endpoint: "/preapproval",
      method: "POST",
      responseBody: expect.objectContaining({ status: 400 }),
      providerRequestId: "provider-request-123",
    });
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response("not-json", { status: 200 }),
    );
    await expect(adapter.getSubscription("id")).rejects.toMatchObject({
      constructor: SubscriptionProviderError,
      providerStatus: 200,
      providerCode: "INVALID_RESPONSE",
      endpoint: "/preapproval/id",
      method: "GET",
      responseBody: "not-json",
    });
  });

  it("rejeita checkout fora dos dominios HTTPS do Mercado Pago", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          ...subscriptionBody,
          init_point: "https://mercadopago.com.br.attacker.test/checkout",
        }),
      ),
    );
    await expect(
      new MercadoPagoSubscriptionProvider().getSubscription("preapproval-1"),
    ).rejects.toBeInstanceOf(SubscriptionProviderError);
  });
});
