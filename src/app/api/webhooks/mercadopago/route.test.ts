import { createHmac } from "node:crypto";

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  processWebhook: vi.fn(),
  processPaymentWebhook: vi.fn(),
}));

vi.mock("@/server/config/env", () => ({
  getSubscriptionEnv: () => ({
    MERCADO_PAGO_MODE: "test",
    MERCADO_PAGO_WEBHOOK_SECRET: "webhook-secret-long-enough",
  }),
}));
vi.mock("@/server/subscriptions/mercado-pago-provider", () => ({
  mercadoPagoSubscriptionProvider: {},
}));
vi.mock("@/server/subscriptions/prisma-subscription-repository", () => ({
  prismaSubscriptionRepository: {},
}));
vi.mock("@/server/subscriptions/subscription-service", () => ({
  processMercadoPagoWebhook: mocks.processWebhook,
}));
vi.mock("@/server/payments/mercado-pago-payment-provider", () => ({
  mercadoPagoPaymentProvider: {},
}));
vi.mock("@/server/payments/prisma-payment-repository", () => ({
  prismaPaymentRepository: {},
}));
vi.mock("@/server/payments/payment-service", () => ({
  processAccessPaymentWebhook: mocks.processPaymentWebhook,
}));

import { buildWebhookManifest } from "@/server/subscriptions/webhook-signature";

import { POST } from "./route";

const dataId = "preapproval-1";
const requestId = "request-1";
const timestamp = "1704908010";
const signature = createHmac("sha256", "webhook-secret-long-enough")
  .update(buildWebhookManifest(dataId, requestId, timestamp))
  .digest("hex");

function request(xSignature = `ts=${timestamp},v1=${signature}`) {
  return new NextRequest(
    `https://app.example.test/api/webhooks/mercadopago?data.id=${dataId}`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-request-id": requestId,
        "x-signature": xSignature,
      },
      body: JSON.stringify({
        id: "event-1",
        live_mode: false,
        type: "subscription_preapproval",
        action: "updated",
        data: { id: dataId },
      }),
    },
  );
}

describe("webhook Mercado Pago", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.processWebhook.mockResolvedValue("processed");
    mocks.processPaymentWebhook.mockResolvedValue("processed");
  });

  it("aceita assinatura valida e delega consulta oficial", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true, duplicate: false });
    expect(mocks.processWebhook).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: "mp:event-1",
        type: "subscription_preapproval",
        resourceId: dataId,
      }),
      {},
      {},
      expect.any(Date),
    );
  });

  it("rejeita assinatura invalida sem alterar estado", async () => {
    const response = await POST(
      request(`ts=${timestamp},v1=${"a".repeat(64)}`),
    );
    expect(response.status).toBe(401);
    expect(mocks.processWebhook).not.toHaveBeenCalled();
  });

  it("responde sucesso idempotente para evento repetido", async () => {
    mocks.processWebhook.mockResolvedValue("duplicate");
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true, duplicate: true });
  });

  it("encaminha eventos payment ao fluxo avulso", async () => {
    const paymentRequest = new NextRequest(
      `https://app.example.test/api/webhooks/mercadopago?data.id=${dataId}`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-request-id": requestId,
          "x-signature": `ts=${timestamp},v1=${signature}`,
        },
        body: JSON.stringify({
          id: "event-payment",
          live_mode: false,
          type: "payment",
          action: "payment.updated",
          data: { id: dataId },
        }),
      },
    );
    const response = await POST(paymentRequest);

    expect(response.status).toBe(200);
    expect(mocks.processPaymentWebhook).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: "mp:event-payment",
        resourceId: dataId,
      }),
      {},
      {},
      {},
      expect.any(Date),
    );
    expect(mocks.processWebhook).not.toHaveBeenCalled();
  });
});
