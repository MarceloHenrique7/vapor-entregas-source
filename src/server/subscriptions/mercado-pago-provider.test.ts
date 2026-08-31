import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/server/config/env", () => ({
  getSubscriptionEnv: () => ({
    MERCADO_PAGO_ACCESS_TOKEN: "test-token-not-a-real-secret",
    MERCADO_PAGO_API_BASE_URL: "https://api.mercadopago.test",
  }),
}));

import { SubscriptionProviderError } from "./errors";
import { MercadoPagoSubscriptionProvider } from "./mercado-pago-provider";

const planBody = {
  id: "provider-plan-1",
  reason: "Assinatura mensal Vapor Entregas - Motoboy",
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
  beforeEach(() => vi.restoreAllMocks());

  it("cria plano mensal BRL com idempotencia", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify(planBody)));
    await new MercadoPagoSubscriptionProvider().createPlan({
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
  });

  it("cria preapproval autorizado com o token gerado pelo SDK", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify(subscriptionBody)));
    await expect(
      new MercadoPagoSubscriptionProvider().createAuthorized({
        providerPlanId: "provider-plan-1",
        cardTokenId: "card-token-valid-1234567890",
        externalReference: "subscription:local-subscription-1",
        payerEmail: "payer@example.test",
        reason: "Plano mensal",
        backUrl: "https://app.example.test/app/motoboy/assinatura/retorno",
        notificationUrl:
          "https://app.example.test/api/webhooks/mercadopago?source_news=webhooks",
      }),
    ).resolves.toMatchObject({
      id: "preapproval-1",
      planId: "provider-plan-1",
    });
    const sent = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
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
          message: "invalid preapproval payload",
          error: "bad_request",
          status: 400,
          cause: [{ code: 1234, description: "payer_email is invalid" }],
          access_token: "TEST-provider-private-token",
        }),
        { status: 400 },
      ),
    );
    await expect(
      adapter.createAuthorized({
        providerPlanId: "provider-plan-1",
        cardTokenId: "card-token-valid-1234567890",
        externalReference: "subscription:local-subscription-1",
        payerEmail: "payer@example.test",
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
