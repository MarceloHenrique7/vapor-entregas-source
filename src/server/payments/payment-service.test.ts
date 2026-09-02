import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  SubscriptionConflictError,
  SubscriptionNotFoundError,
} from "@/server/subscriptions/errors";
import type {
  SubscriptionPlanRecord,
  SubscriptionRecord,
  SubscriptionRepository,
} from "@/server/subscriptions/types";

import {
  createAccessPayment,
  mapPaymentStatus,
  processAccessPaymentWebhook,
  refreshAccessPayment,
} from "./payment-service";
import type {
  PaymentAttemptRecord,
  PaymentProviderClient,
  PaymentRepository,
  ProviderOneOffPayment,
} from "./types";

const now = new Date("2026-09-02T12:00:00.000Z");
const userId = "10000000-0000-4000-8000-000000000001";
const planId = "20000000-0000-4000-8000-000000000001";
const subscriptionId = "30000000-0000-4000-8000-000000000001";
const attemptId = "40000000-0000-4000-8000-000000000001";

const plan: SubscriptionPlanRecord = {
  id: planId,
  role: "MOTOBOY",
  name: "Motoboy",
  description: "Plano Motoboy",
  monthlyPrice: 19.9,
  active: true,
  trialDays: 7,
  externalPlanId: "legacy-plan",
  externalPlanMode: "test",
  createdAt: now,
  updatedAt: now,
};

function subscription(
  overrides: Partial<SubscriptionRecord> = {},
): SubscriptionRecord {
  return {
    id: subscriptionId,
    userId,
    planId,
    externalReference: null,
    providerPlanId: null,
    providerSubscriptionId: null,
    providerStatus: null,
    status: "TRIAL",
    monthlyPrice: 19.9,
    checkoutUrl: null,
    currentPeriodStart: now,
    currentPeriodEnd: new Date("2026-09-09T12:00:00.000Z"),
    nextPaymentAt: null,
    trialGrantedAt: now,
    trialEndsAt: new Date("2026-09-09T12:00:00.000Z"),
    canceledAt: null,
    createdAt: now,
    updatedAt: now,
    plan,
    events: [],
    payments: [],
    ...overrides,
  };
}

function subscriptionRepository(current = subscription()) {
  return {
    getBillingUser: vi.fn(async () => ({
      id: userId,
      email: "buyer@example.test",
      role: "MOTOBOY" as const,
      status: "ACTIVE" as const,
    })),
    getPlanForRole: vi.fn(async () => plan),
    getCurrent: vi.fn(async () => current),
    createDraft: vi.fn(async () => current),
    findById: vi.fn(async () => current),
  } as unknown as SubscriptionRepository;
}

function paymentRepository() {
  const attempts = new Map<string, PaymentAttemptRecord>();
  const providerIds = new Map<string, string>();
  const externalReferences = new Map<string, string>();
  const events = new Set<string>();
  let accessGrants = 0;
  const repository: PaymentRepository = {
    async createAttempt(input) {
      const byKey = [...attempts.values()].find(
        (item) => item.idempotencyKey === input.idempotencyKey,
      );
      if (byKey) return { attempt: byKey, reused: true };
      const attempt: PaymentAttemptRecord = {
        id: input.id,
        subscriptionId: input.subscription.id,
        userId: input.userId,
        planId: input.planId,
        providerPaymentId: null,
        externalReference: input.externalReference,
        idempotencyKey: input.idempotencyKey,
        amount: input.amount,
        currency: "BRL",
        status: "CREATED",
        providerStatusDetail: null,
        paymentMethod: null,
        paidAt: null,
        expiresAt: null,
        accessGrantedAt: null,
        providerCreatedAt: null,
        createdAt: input.now,
        updatedAt: input.now,
      };
      attempts.set(attempt.id, attempt);
      externalReferences.set(input.externalReference, attempt.id);
      return { attempt, reused: false };
    },
    async findAttemptById(id) {
      return attempts.get(id) ?? null;
    },
    async findAttemptByProviderId(id) {
      const localId = providerIds.get(id);
      return localId ? (attempts.get(localId) ?? null) : null;
    },
    async findAttemptByExternalReference(reference) {
      const localId = externalReferences.get(reference);
      return localId ? (attempts.get(localId) ?? null) : null;
    },
    async attachProviderPayment(id, payment, status) {
      const attempt = attempts.get(id)!;
      const updated = {
        ...attempt,
        providerPaymentId: payment.id,
        status,
        paymentMethod: payment.paymentMethod,
        providerStatusDetail: payment.statusDetail,
      };
      attempts.set(id, updated);
      providerIds.set(payment.id, id);
      return updated;
    },
    async markAttemptError(id) {
      const attempt = attempts.get(id);
      if (attempt && !attempt.providerPaymentId) {
        attempts.set(id, { ...attempt, status: "ERROR" });
      }
    },
    async applyConfirmedPayment(input) {
      if (events.has(input.eventId)) return "duplicate";
      events.add(input.eventId);
      const attempt = attempts.get(input.attemptId)!;
      if (input.status === "APPROVED" && !attempt.accessGrantedAt) {
        attempts.set(input.attemptId, {
          ...attempt,
          status: input.status,
          accessGrantedAt: input.processedAt,
        });
        accessGrants += 1;
        return "access_granted";
      }
      attempts.set(input.attemptId, { ...attempt, status: input.status });
      return "processed";
    },
  };
  return {
    repository,
    attempts,
    get accessGrants() {
      return accessGrants;
    },
  };
}

function provider(
  status = "approved",
  mutate: Partial<ProviderOneOffPayment> = {},
) {
  let createdInput:
    Parameters<PaymentProviderClient["createPayment"]>[0] | null = null;
  let payment: ProviderOneOffPayment | null = null;
  const client: PaymentProviderClient = {
    createPayment: vi.fn(async (input) => {
      createdInput = input;
      payment = {
        id: "provider-payment-1",
        status,
        statusDetail: status === "rejected" ? "cc_rejected_other_reason" : null,
        paymentMethod: input.paymentMethodId,
        amount: input.amount,
        currency: "BRL",
        externalReference: input.externalReference,
        internalPaymentId: input.internalPaymentId,
        userId: input.userId,
        planId: input.planId,
        role: input.role,
        paidAt: status === "approved" ? now : null,
        createdAt: now,
        expiresAt: null,
        pix:
          input.paymentMethodId === "pix"
            ? { qrCode: "safe-pix-code", qrCodeBase64: null, ticketUrl: null }
            : null,
        ...mutate,
      };
      return payment;
    }),
    getPayment: vi.fn(async () => {
      if (!payment) throw new Error("PAYMENT_NOT_CREATED");
      return payment;
    }),
  };
  return {
    client,
    get createdInput() {
      return createdInput;
    },
    set payment(value) {
      payment = value;
    },
  };
}

function cardInput(overrides: Record<string, unknown> = {}) {
  return {
    attemptId,
    selectedPaymentMethod: "creditCard",
    formData: {
      payment_method_id: "visa",
      token: "temporary-card-token-123456",
      installments: 1,
      transaction_amount: 0.01,
      payer: {
        email: "attacker@example.test",
        identification: { type: "CPF", number: "52998224725" },
      },
    },
    planId: "attacker-plan",
    amount: 0.01,
    ...overrides,
  };
}

beforeEach(() => {
  process.env.MERCADO_PAGO_MODE = "test";
  process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY =
    "TEST-123456-public-key-value";
  process.env.MERCADO_PAGO_ACCESS_TOKEN = "TEST-123456-access-token-value";
  process.env.MERCADO_PAGO_WEBHOOK_SECRET = "webhook-secret-long-enough";
  process.env.MERCADO_PAGO_API_BASE_URL = "https://api.mercadopago.com";
  process.env.NEXT_PUBLIC_APP_URL = "https://app.example.test";
  vi.restoreAllMocks();
  vi.spyOn(console, "info").mockImplementation(() => undefined);
});

describe("pagamentos avulsos do acesso", () => {
  it("mapeia explicitamente os status do provedor", () => {
    expect(mapPaymentStatus("approved")).toBe("APPROVED");
    expect(mapPaymentStatus("in_process")).toBe("PENDING");
    expect(mapPaymentStatus("rejected")).toBe("REJECTED");
    expect(mapPaymentStatus("cancelled")).toBe("CANCELLED");
    expect(mapPaymentStatus("refunded")).toBe("REFUNDED");
    expect(mapPaymentStatus("desconhecido")).toBe("ERROR");
  });

  it("pagamento aprovado concede acesso", async () => {
    const payments = paymentRepository();
    const mp = provider("approved");
    const result = await createAccessPayment(
      { userId, role: "MOTOBOY", status: "ACTIVE" },
      cardInput(),
      subscriptionRepository(),
      payments.repository,
      mp.client,
      now,
    );

    expect(result.payment.status).toBe("APPROVED");
    expect(payments.accessGrants).toBe(1);
  });

  it("pending e Pix gerado não liberam acesso", async () => {
    const payments = paymentRepository();
    const mp = provider("pending");
    const result = await createAccessPayment(
      { userId, role: "MOTOBOY", status: "ACTIVE" },
      {
        attemptId,
        selectedPaymentMethod: "bank_transfer",
        formData: { payment_method_id: "pix", transaction_amount: 0.01 },
      },
      subscriptionRepository(),
      payments.repository,
      mp.client,
      now,
    );

    expect(result.payment.status).toBe("PENDING");
    expect(result.payment.pix?.qrCode).toBe("safe-pix-code");
    expect(payments.accessGrants).toBe(0);
  });

  it("pagamento recusado não libera acesso", async () => {
    const payments = paymentRepository();
    const result = await createAccessPayment(
      { userId, role: "MOTOBOY", status: "ACTIVE" },
      cardInput(),
      subscriptionRepository(),
      payments.repository,
      provider("rejected").client,
      now,
    );
    expect(result.payment.status).toBe("REJECTED");
    expect(payments.accessGrants).toBe(0);
  });

  it("ignora preço, plano e e-mail manipulados pelo frontend", async () => {
    const payments = paymentRepository();
    const mp = provider("approved");
    await createAccessPayment(
      { userId, role: "MOTOBOY", status: "ACTIVE" },
      cardInput(),
      subscriptionRepository(),
      payments.repository,
      mp.client,
      now,
    );

    expect(mp.createdInput).toMatchObject({
      amount: 19.9,
      planId,
      payerEmail: "buyer@example.test",
      role: "MOTOBOY",
    });
  });

  it("não persiste token do cartão na tentativa local", async () => {
    const payments = paymentRepository();
    await createAccessPayment(
      { userId, role: "MOTOBOY", status: "ACTIVE" },
      cardInput(),
      subscriptionRepository(),
      payments.repository,
      provider().client,
      now,
    );
    expect(JSON.stringify([...payments.attempts.values()])).not.toContain(
      "temporary-card-token",
    );
    expect(JSON.stringify(vi.mocked(console.info).mock.calls)).not.toContain(
      "temporary-card-token",
    );
    expect(JSON.stringify(vi.mocked(console.info).mock.calls)).not.toContain(
      "52998224725",
    );
  });

  it("rejeita valor confirmado diferente do plano", async () => {
    const payments = paymentRepository();
    await expect(
      createAccessPayment(
        { userId, role: "MOTOBOY", status: "ACTIVE" },
        cardInput(),
        subscriptionRepository(),
        payments.repository,
        provider("approved", { amount: 0.01 }).client,
        now,
      ),
    ).rejects.toBeInstanceOf(SubscriptionConflictError);
    expect(payments.accessGrants).toBe(0);
  });

  it("rejeita role confirmada diferente da conta", async () => {
    const payments = paymentRepository();
    await expect(
      createAccessPayment(
        { userId, role: "MOTOBOY", status: "ACTIVE" },
        cardInput(),
        subscriptionRepository(),
        payments.repository,
        provider("approved", { role: "COMPANY" }).client,
        now,
      ),
    ).rejects.toBeInstanceOf(SubscriptionConflictError);
    expect(payments.accessGrants).toBe(0);
  });

  it("retry com a mesma idempotency key não cria benefício duplicado", async () => {
    const payments = paymentRepository();
    const mp = provider("approved");
    const args = [
      { userId, role: "MOTOBOY" as const, status: "ACTIVE" as const },
      cardInput(),
      subscriptionRepository(),
      payments.repository,
      mp.client,
      now,
    ] as const;
    await createAccessPayment(...args);
    await createAccessPayment(...args);

    expect(mp.client.createPayment).toHaveBeenCalledTimes(1);
    expect(payments.accessGrants).toBe(1);
  });

  it("webhook duplicado não concede 60 dias", async () => {
    const payments = paymentRepository();
    const mp = provider("approved");
    await createAccessPayment(
      { userId, role: "MOTOBOY", status: "ACTIVE" },
      cardInput(),
      subscriptionRepository(),
      payments.repository,
      mp.client,
      now,
    );
    const webhook = {
      eventId: "mp:event-1",
      action: "payment.updated",
      resourceId: "provider-payment-1",
    };
    await processAccessPaymentWebhook(
      webhook,
      subscriptionRepository(),
      payments.repository,
      mp.client,
      now,
    );
    const duplicate = await processAccessPaymentWebhook(
      webhook,
      subscriptionRepository(),
      payments.repository,
      mp.client,
      now,
    );

    expect(duplicate).toBe("duplicate");
    expect(payments.accessGrants).toBe(1);
  });

  it("polling exige ownership do pagamento", async () => {
    const payments = paymentRepository();
    await expect(
      refreshAccessPayment(
        { userId: "different-user", role: "MOTOBOY", status: "ACTIVE" },
        "unknown-payment",
        subscriptionRepository(),
        payments.repository,
        provider().client,
        now,
      ),
    ).rejects.toBeInstanceOf(SubscriptionNotFoundError);
  });

  it("bloqueia compra avulsa enquanto recorrência legada estiver aberta", async () => {
    const payments = paymentRepository();
    await expect(
      createAccessPayment(
        { userId, role: "MOTOBOY", status: "ACTIVE" },
        cardInput(),
        subscriptionRepository(
          subscription({ providerSubscriptionId: "legacy-subscription" }),
        ),
        payments.repository,
        provider().client,
        now,
      ),
    ).rejects.toBeInstanceOf(SubscriptionConflictError);
  });

  it("erro temporário do provider não concede nem corrompe acesso", async () => {
    const payments = paymentRepository();
    const mp = provider();
    vi.mocked(mp.client.createPayment).mockRejectedValueOnce(
      new Error("provider unavailable"),
    );
    await expect(
      createAccessPayment(
        { userId, role: "MOTOBOY", status: "ACTIVE" },
        cardInput(),
        subscriptionRepository(),
        payments.repository,
        mp.client,
        now,
      ),
    ).rejects.toThrow("provider unavailable");
    expect(payments.accessGrants).toBe(0);
    expect([...payments.attempts.values()][0]?.status).toBe("ERROR");
  });
});
