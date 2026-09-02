import { afterEach, describe, expect, it, vi } from "vitest";

import { SubscriptionProviderError } from "./errors";
import { subscriptionErrorResponse } from "./route-response";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("subscription provider public errors", () => {
  it("keeps Mercado Pago diagnostics exclusively in the server log", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = subscriptionErrorResponse(
      new SubscriptionProviderError({
        providerStatus: 400,
        providerCode: "bad_request",
        providerMessage: "provider-private-detail",
        endpoint: "/preapproval",
        method: "POST",
        responseBody: { message: "provider-private-detail" },
      }),
    );
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(502);
    expect(body).toEqual({
      error:
        "Não foi possível autorizar este cartão. Revise os dados ou tente outro cartão.",
      correlationId: expect.any(String),
    });
    expect(JSON.stringify(body)).not.toContain("provider-private-detail");
    expect(body).not.toHaveProperty("providerStatus");
    expect(body).not.toHaveProperty("responseBody");
  });

  it("explica divergência de país sem expor a resposta privada", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = subscriptionErrorResponse(
      new SubscriptionProviderError({
        providerStatus: 400,
        providerCode: "guest_site_mismatch",
        providerMessage: "Payer is associated with a different site",
        endpoint: "/preapproval",
        method: "POST",
      }),
    );
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(502);
    expect(body).toMatchObject({
      error:
        "O comprador de teste pertence a outro país no Mercado Pago. Use uma conta compradora de teste do Brasil vinculada ao mesmo ambiente do vendedor.",
      correlationId: expect.any(String),
    });
    expect(JSON.stringify(body)).not.toContain(
      "Payer is associated with a different site",
    );
  });

  it("explica usuários inválidos no Sandbox sem expor o provider", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = subscriptionErrorResponse(
      new SubscriptionProviderError({
        providerStatus: 400,
        providerCode: "bad_request",
        providerMessage: "Invalid users involved",
        providerCause: [{ code: 2034, description: "Invalid users involved" }],
        endpoint: "/v1/payments",
        method: "POST",
      }),
    );
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(502);
    expect(body).toMatchObject({
      error:
        "Os usuários do teste são incompatíveis. Informe no Brick um e-mail comum, diferente da conta vendedora e que não termine em @testuser.com.",
      correlationId: expect.any(String),
    });
    expect(JSON.stringify(body)).not.toContain("Invalid users involved");
  });

  it("explica incompatibilidade local sem expor IDs ou credenciais", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = subscriptionErrorResponse(
      new SubscriptionProviderError({
        providerCode: "LOCAL_PLAN_COLLECTOR_MISMATCH",
        providerMessage: "private seller and plan identifiers",
        endpoint: "/preapproval",
        method: "POST",
      }),
    );
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(502);
    expect(body).toMatchObject({
      error:
        "A configuração do Mercado Pago está incompatível neste ambiente. Consulte o diagnóstico pelo código de correlação.",
      correlationId: expect.any(String),
    });
    expect(JSON.stringify(body)).not.toContain("private seller");
  });
});
