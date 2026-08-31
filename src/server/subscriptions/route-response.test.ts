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
      error: "O Mercado Pago não concluiu esta operação. Tente novamente.",
      correlationId: expect.any(String),
    });
    expect(JSON.stringify(body)).not.toContain("provider-private-detail");
    expect(body).not.toHaveProperty("providerStatus");
    expect(body).not.toHaveProperty("responseBody");
  });
});
