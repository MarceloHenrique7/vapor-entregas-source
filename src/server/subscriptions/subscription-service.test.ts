import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/config/env", () => ({
  getSubscriptionEnv: () => ({
    MERCADO_PAGO_MODE: "test",
    NEXT_PUBLIC_APP_URL: "https://app.example.test",
  }),
}));

import { ForbiddenError } from "@/server/auth/errors";

import {
  SubscriptionConflictError,
  SubscriptionProviderError,
  SubscriptionRequiredError,
} from "./errors";
import {
  assertOperationalSubscription,
  cancelMySubscription,
  ensureProviderPlan,
  mapProviderStatus,
  processMercadoPagoWebhook,
  refreshMySubscription,
  startSubscription,
} from "./subscription-service";
import type {
  ProviderPayment,
  ProviderPlan,
  ProviderSubscription,
  SubscriptionPlanRecord,
  SubscriptionProviderClient,
  SubscriptionRecord,
  SubscriptionRepository,
} from "./types";

const now = new Date("2026-08-30T18:00:00.000Z");
const cardTokenId = "card-token-valid-1234567890";
const clientDiagnostics = {
  publicKeyConfigured: true,
  publicKeyEnvironment: "test" as const,
  publicKeyHash: "a".repeat(64),
};
const motoboyPlan: SubscriptionPlanRecord = {
  id: "15000000-0000-4000-8000-000000000001",
  role: "MOTOBOY",
  name: "Motoboy",
  description: "Acesso mensal",
  monthlyPrice: 19.9,
  active: true,
  trialDays: 0,
  externalPlanId: "provider-plan-motoboy",
  externalPlanMode: "test",
  createdAt: now,
  updatedAt: now,
};
const companyPlan: SubscriptionPlanRecord = {
  ...motoboyPlan,
  id: "15000000-0000-4000-8000-000000000002",
  role: "COMPANY",
  name: "Empresa",
  monthlyPrice: 29.9,
  externalPlanId: "provider-plan-company",
};
const providerPlan: ProviderPlan = {
  id: "provider-plan-motoboy",
  applicationId: "1234567890",
  collectorId: "987654321",
  belongsToCurrentApplication: true,
  reason: "Vapor Entregas - Plano Motoboy",
  amount: 19.9,
  currency: "BRL",
  frequency: 1,
  frequencyType: "months",
  trialDays: 0,
  status: "active",
  backUrl: "https://app.example.test",
};
const providerValue: ProviderSubscription = {
  id: "preapproval-test-1",
  status: "authorized",
  checkoutUrl: null,
  externalReference: "subscription:subscription-id",
  currentPeriodStart: null,
  currentPeriodEnd: null,
  nextPaymentAt: null,
  planId: providerPlan.id,
};
const approvedPayment: ProviderPayment = {
  authorizedPaymentId: "invoice-1",
  paymentId: "payment-1",
  subscriptionId: providerValue.id,
  externalReference: providerValue.externalReference,
  amount: 19.9,
  currency: "BRL",
  status: "approved",
  paidAt: now,
  createdAt: now,
};

const subscription = (
  status: SubscriptionRecord["status"] = "PENDING",
  plan = motoboyPlan,
): SubscriptionRecord => ({
  id: "subscription-id",
  userId: "user-id",
  planId: plan.id,
  externalReference: "subscription:subscription-id",
  providerPlanId: plan.externalPlanId,
  providerSubscriptionId: providerValue.id,
  providerStatus:
    status === "ACTIVE" || status === "TRIAL"
      ? "authorized"
      : status === "PAUSED"
        ? "paused"
        : "pending",
  status,
  monthlyPrice: plan.monthlyPrice,
  checkoutUrl: providerValue.checkoutUrl,
  currentPeriodStart: null,
  currentPeriodEnd: null,
  nextPaymentAt: null,
  canceledAt: null,
  createdAt: now,
  updatedAt: now,
  plan,
  events: [],
  payments: [],
});

function repository(
  overrides: Partial<SubscriptionRepository> = {},
): SubscriptionRepository {
  return {
    listPlans: vi.fn().mockResolvedValue([motoboyPlan, companyPlan]),
    getPlanForRole: vi
      .fn()
      .mockImplementation(async (role) =>
        role === "MOTOBOY" ? motoboyPlan : companyPlan,
      ),
    getBillingUser: vi.fn().mockResolvedValue({
      id: "user-id",
      email: "payer@example.test",
      role: "MOTOBOY",
      status: "ACTIVE",
    }),
    getLatest: vi.fn().mockResolvedValue(null),
    getCurrent: vi.fn().mockResolvedValue(null),
    hasPriorSubscription: vi.fn().mockResolvedValue(false),
    findById: vi.fn().mockResolvedValue(subscription()),
    findByExternalReference: vi.fn().mockResolvedValue(subscription()),
    saveProviderPlan: vi.fn().mockImplementation(async (_id, id, mode) => ({
      ...motoboyPlan,
      externalPlanId: id,
      externalPlanMode: mode,
    })),
    createTrial: vi.fn().mockResolvedValue(subscription("TRIAL")),
    createDraft: vi.fn().mockResolvedValue(subscription()),
    attachProvider: vi.fn().mockImplementation(async (_id, value, status) => ({
      ...subscription(status),
      providerSubscriptionId: value.id,
      providerStatus: value.status,
    })),
    expireDraft: vi.fn().mockResolvedValue(undefined),
    findByProviderId: vi.fn().mockResolvedValue(subscription()),
    updateFromProvider: vi
      .fn()
      .mockImplementation(async (_id, value, status) => ({
        ...subscription(status),
        providerStatus: value.status,
      })),
    cancelLocal: vi.fn().mockResolvedValue(subscription("CANCELED")),
    applyProviderEvent: vi.fn().mockResolvedValue("processed"),
    recordLocalEvent: vi.fn().mockResolvedValue(undefined),
    hasOperationalSubscription: vi.fn().mockResolvedValue(true),
    updatePlan: vi.fn().mockResolvedValue(motoboyPlan),
    ...overrides,
  };
}

function provider(
  overrides: Partial<SubscriptionProviderClient> = {},
): SubscriptionProviderClient {
  return {
    createPlan: vi.fn().mockResolvedValue(providerPlan),
    getPlan: vi
      .fn()
      .mockImplementation(async (id) => ({ ...providerPlan, id })),
    updatePlan: vi.fn().mockResolvedValue(providerPlan),
    createAuthorized: vi.fn().mockResolvedValue(providerValue),
    getSubscription: vi
      .fn()
      .mockResolvedValue({ ...providerValue, status: "authorized" }),
    cancelSubscription: vi
      .fn()
      .mockResolvedValue({ ...providerValue, status: "canceled" }),
    reactivateSubscription: vi
      .fn()
      .mockResolvedValue({ ...providerValue, status: "authorized" }),
    getAuthorizedPayment: vi.fn().mockResolvedValue(approvedPayment),
    getPayment: vi.fn().mockResolvedValue(approvedPayment),
    ...overrides,
  };
}

const motoboy = {
  userId: "user-id",
  role: "MOTOBOY" as const,
  status: "ACTIVE" as const,
};
const company = {
  userId: "company-id",
  role: "COMPANY" as const,
  status: "ACTIVE" as const,
};

describe("assinaturas recorrentes da plataforma", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    [motoboy, motoboyPlan, "payer@example.test"],
    [company, companyPlan, "company@example.test"],
  ])(
    "seleciona exclusivamente o plano da role autenticada",
    async (actor, expectedPlan, email) => {
      const repo = repository({
        getBillingUser: vi.fn().mockResolvedValue({
          id: actor.userId,
          email,
          role: actor.role,
          status: "ACTIVE",
        }),
        createDraft: vi
          .fn()
          .mockResolvedValue(subscription("PENDING", expectedPlan)),
      });
      const client = provider({
        getPlan: vi.fn().mockResolvedValue({
          ...providerPlan,
          id: expectedPlan.externalPlanId!,
          reason: `Vapor Entregas - Plano ${expectedPlan.name}`,
          amount: expectedPlan.monthlyPrice,
          backUrl: "https://app.example.test",
        }),
        createAuthorized: vi.fn().mockResolvedValue({
          ...providerValue,
          planId: expectedPlan.externalPlanId,
        }),
      });
      await startSubscription(actor, { cardTokenId }, repo, client, now);
      expect(repo.getPlanForRole).toHaveBeenCalledWith(actor.role);
      expect(client.createAuthorized).toHaveBeenCalledWith(
        expect.objectContaining({
          providerPlanId: expectedPlan.externalPlanId,
          sellerAccountId: providerPlan.collectorId,
          cardTokenId,
          payerEmail: email,
          payerEmailMatchesLoggedUser: true,
        }),
      );
    },
  );

  it("rejeita amount e providerPlanId enviados pelo navegador", async () => {
    const repo = repository();
    const client = provider();
    await expect(
      startSubscription(
        motoboy,
        { cardTokenId, amount: 0.01 },
        repo,
        client,
        now,
      ),
    ).rejects.toThrow();
    await expect(
      startSubscription(
        motoboy,
        { cardTokenId, providerPlanId: "attacker-plan" },
        repo,
        client,
        now,
      ),
    ).rejects.toThrow();
    expect(client.createAuthorized).not.toHaveBeenCalled();
  });

  it("rejeita checkout sem cardTokenId", async () => {
    const client = provider();
    await expect(
      startSubscription(motoboy, {}, repository(), client, now),
    ).rejects.toThrow();
    expect(client.createAuthorized).not.toHaveBeenCalled();
  });

  it("salva correlacao opaca e usa email obtido no backend", async () => {
    const repo = repository();
    const client = provider();
    const result = await startSubscription(
      motoboy,
      { cardTokenId, clientDiagnostics },
      repo,
      client,
      now,
    );
    expect(result).toMatchObject({ status: "ACTIVE", monthlyPrice: 19.9 });
    expect(client.createAuthorized).toHaveBeenCalledWith(
      expect.objectContaining({
        cardTokenId,
        clientDiagnostics,
        externalReference: "subscription:subscription-id",
        payerEmail: "payer@example.test",
        payerEmailMatchesLoggedUser: true,
      }),
    );
    expect(client.createAuthorized).not.toHaveBeenCalledWith(
      expect.objectContaining({ monthlyPrice: expect.anything() }),
    );
    expect(repo.createDraft).toHaveBeenCalledWith(
      motoboy.userId,
      motoboyPlan,
      now,
    );
    expect(
      JSON.stringify(vi.mocked(repo.createDraft).mock.calls),
    ).not.toContain(cardTokenId);
    expect(
      JSON.stringify(vi.mocked(repo.attachProvider).mock.calls),
    ).not.toContain(cardTokenId);
  });

  it("consulta e reutiliza plano remoto compativel", async () => {
    const repo = repository();
    const client = provider();
    await ensureProviderPlan(motoboyPlan, repo, client);
    expect(client.getPlan).toHaveBeenCalledWith("provider-plan-motoboy");
    expect(client.createPlan).not.toHaveBeenCalled();
    expect(repo.saveProviderPlan).toHaveBeenCalledWith(
      motoboyPlan.id,
      "provider-plan-motoboy",
      "test",
    );
  });

  it("cria plano remoto uma unica vez com idempotency key quando o ID esta ausente", async () => {
    const repo = repository();
    const client = provider();
    await ensureProviderPlan(
      { ...motoboyPlan, externalPlanId: null },
      repo,
      client,
    );
    expect(client.createPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey: `plan:test:${motoboyPlan.id}:19.90:initial`,
        monthlyPrice: 19.9,
      }),
    );
  });

  it("recria plano quando o Mercado Pago responde 400 Resource not found", async () => {
    const repo = repository();
    const client = provider({
      getPlan: vi
        .fn()
        .mockRejectedValueOnce(
          new SubscriptionProviderError({
            providerStatus: 400,
            providerMessage: "Resource not found",
          }),
        )
        .mockResolvedValueOnce({
          ...providerPlan,
          id: "provider-plan-recreated",
        }),
      createPlan: vi.fn().mockResolvedValue({
        ...providerPlan,
        id: "provider-plan-recreated",
      }),
    });

    await ensureProviderPlan(motoboyPlan, repo, client);

    expect(client.createPlan).toHaveBeenCalledOnce();
    expect(client.getPlan).toHaveBeenNthCalledWith(
      2,
      "provider-plan-recreated",
    );
    expect(repo.saveProviderPlan).toHaveBeenCalledWith(
      motoboyPlan.id,
      "provider-plan-recreated",
      "test",
    );
  });

  it("nao reutiliza plano pertencente a outra aplicacao", async () => {
    const repo = repository();
    const client = provider({
      getPlan: vi
        .fn()
        .mockResolvedValueOnce({
          ...providerPlan,
          belongsToCurrentApplication: false,
        })
        .mockResolvedValueOnce({
          ...providerPlan,
          id: "provider-plan-current-app",
        }),
      createPlan: vi.fn().mockResolvedValue({
        ...providerPlan,
        id: "provider-plan-current-app",
      }),
    });

    await ensureProviderPlan(motoboyPlan, repo, client);

    expect(client.createPlan).toHaveBeenCalledOnce();
    expect(repo.saveProviderPlan).toHaveBeenCalledWith(
      motoboyPlan.id,
      "provider-plan-current-app",
      "test",
    );
  });

  it("versiona o plano remoto quando o preco muda", async () => {
    const repo = repository();
    const client = provider({
      getPlan: vi
        .fn()
        .mockResolvedValueOnce({ ...providerPlan, amount: 20 })
        .mockResolvedValueOnce({
          ...providerPlan,
          id: "provider-plan-new-price",
        }),
      createPlan: vi.fn().mockResolvedValue({
        ...providerPlan,
        id: "provider-plan-new-price",
      }),
    });
    await ensureProviderPlan(motoboyPlan, repo, client);
    expect(client.updatePlan).not.toHaveBeenCalled();
    expect(client.createPlan).toHaveBeenCalled();
    expect(repo.saveProviderPlan).toHaveBeenCalledWith(
      motoboyPlan.id,
      "provider-plan-new-price",
      "test",
    );
  });

  it("reutiliza draft sem provider para repetir a mesma criacao idempotente", async () => {
    const draft = {
      ...subscription("PENDING"),
      providerSubscriptionId: null,
      providerStatus: null,
      checkoutUrl: null,
    };
    const repo = repository({ getCurrent: vi.fn().mockResolvedValue(draft) });
    await startSubscription(motoboy, { cardTokenId }, repo, provider(), now);
    expect(repo.createDraft).not.toHaveBeenCalled();
    expect(repo.attachProvider).toHaveBeenCalledWith(
      draft.id,
      providerValue,
      "ACTIVE",
    );
  });

  it("preserva sete dias de teste no primeiro contrato", async () => {
    const trialEndsAt = new Date(now.getTime() + 7 * 86_400_000);
    const plan = { ...motoboyPlan, trialDays: 7 };
    const repo = repository({
      getPlanForRole: vi.fn().mockResolvedValue(plan),
      hasPriorSubscription: vi.fn().mockResolvedValue(false),
      createDraft: vi.fn().mockResolvedValue(subscription("PENDING", plan)),
    });
    const client = provider({
      getPlan: vi.fn().mockResolvedValue({ ...providerPlan, trialDays: 7 }),
      createAuthorized: vi.fn().mockResolvedValue({
        ...providerValue,
        nextPaymentAt: trialEndsAt,
      }),
    });

    const result = await startSubscription(
      motoboy,
      { cardTokenId },
      repo,
      client,
      now,
    );

    expect(result?.status).toBe("TRIAL");
    expect(client.createAuthorized).toHaveBeenCalledWith(
      expect.objectContaining({ cardTokenId }),
    );
    expect(repo.attachProvider).toHaveBeenCalledWith(
      "subscription-id",
      expect.objectContaining({ nextPaymentAt: trialEndsAt }),
      "TRIAL",
    );
    expect(repo.createTrial).not.toHaveBeenCalled();
  });

  it("nao concede segundo trial a usuario com historico", async () => {
    const plan = { ...motoboyPlan, trialDays: 7 };
    const noTrialPlan = {
      ...providerPlan,
      id: "provider-plan-without-trial",
      trialDays: 0,
    };
    const repo = repository({
      getPlanForRole: vi.fn().mockResolvedValue(plan),
      hasPriorSubscription: vi.fn().mockResolvedValue(true),
      createDraft: vi.fn().mockResolvedValue(subscription("PENDING", plan)),
    });
    const client = provider({
      createPlan: vi.fn().mockResolvedValue(noTrialPlan),
      createAuthorized: vi.fn().mockResolvedValue({
        ...providerValue,
        planId: noTrialPlan.id,
      }),
    });

    const result = await startSubscription(
      motoboy,
      { cardTokenId },
      repo,
      client,
      now,
    );

    expect(result?.status).toBe("ACTIVE");
    expect(client.createPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        trialDays: 0,
        idempotencyKey: expect.stringContaining("without-trial"),
      }),
    );
    expect(client.createAuthorized).toHaveBeenCalledWith(
      expect.objectContaining({ providerPlanId: noTrialPlan.id }),
    );
    expect(repo.createTrial).not.toHaveBeenCalled();
  });

  it("mapeia pausa separadamente de inadimplencia", () => {
    expect(mapProviderStatus("authorized")).toBe("ACTIVE");
    expect(mapProviderStatus("paused")).toBe("PAUSED");
    expect(mapProviderStatus("canceled")).toBe("CANCELED");
  });

  it("webhook de fatura consulta recursos oficiais e aplica evento atomico", async () => {
    const repo = repository();
    const client = provider();
    await processMercadoPagoWebhook(
      {
        eventId: "mp:event-1",
        type: "subscription_authorized_payment",
        action: "updated",
        resourceId: "invoice-1",
      },
      repo,
      client,
      now,
    );
    expect(client.getAuthorizedPayment).toHaveBeenCalledWith("invoice-1");
    expect(client.getSubscription).toHaveBeenCalledWith(providerValue.id);
    expect(repo.applyProviderEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        subscriptionId: "subscription-id",
        subscriptionStatus: "ACTIVE",
        payment: approvedPayment,
      }),
    );
  });

  it("webhook repetido nao repete efeitos", async () => {
    const repo = repository({
      applyProviderEvent: vi.fn().mockResolvedValue("duplicate"),
    });
    await expect(
      processMercadoPagoWebhook(
        {
          eventId: "mp:duplicate",
          type: "subscription_preapproval",
          action: "updated",
          resourceId: providerValue.id,
        },
        repo,
        provider(),
        now,
      ),
    ).resolves.toBe("duplicate");
  });

  it("cobranca recusada vira PAST_DUE sem cancelar a assinatura", async () => {
    const repo = repository({
      findByProviderId: vi.fn().mockResolvedValue(subscription("ACTIVE")),
    });
    const rejected = { ...approvedPayment, status: "rejected", paidAt: null };
    await processMercadoPagoWebhook(
      {
        eventId: "mp:rejected",
        type: "subscription_authorized_payment",
        action: "updated",
        resourceId: "invoice-1",
      },
      repo,
      provider({ getAuthorizedPayment: vi.fn().mockResolvedValue(rejected) }),
      now,
    );
    expect(repo.applyProviderEvent).toHaveBeenCalledWith(
      expect.objectContaining({ subscriptionStatus: "PAST_DUE" }),
    );
  });

  it("evento com correlacao divergente nao altera a assinatura", async () => {
    const repo = repository();
    await expect(
      processMercadoPagoWebhook(
        {
          eventId: "mp:forged",
          type: "subscription_preapproval",
          action: "updated",
          resourceId: providerValue.id,
        },
        repo,
        provider({
          getSubscription: vi.fn().mockResolvedValue({
            ...providerValue,
            externalReference: "subscription:another-id",
          }),
        }),
        now,
      ),
    ).rejects.toBeInstanceOf(SubscriptionConflictError);
    expect(repo.applyProviderEvent).not.toHaveBeenCalled();
  });

  it("cancelamento exige ownership e nao chama provider para outro usuario", async () => {
    const client = provider();
    await expect(
      cancelMySubscription(
        motoboy,
        { confirm: true },
        repository({
          getCurrent: vi.fn().mockResolvedValue({
            ...subscription("ACTIVE"),
            userId: "another-user",
          }),
        }),
        client,
        now,
      ),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(client.cancelSubscription).not.toHaveBeenCalled();
  });

  it("cancelamento confirmado no provider e auditoria sao atomicos", async () => {
    const repo = repository({
      getCurrent: vi.fn().mockResolvedValue(subscription("ACTIVE")),
      findById: vi.fn().mockResolvedValue(subscription("CANCELED")),
    });
    const result = await cancelMySubscription(
      motoboy,
      { confirm: true },
      repo,
      provider(),
      now,
    );
    expect(result?.status).toBe("CANCELED");
    expect(repo.applyProviderEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "subscription.cancel.requested",
        subscriptionStatus: "CANCELED",
      }),
    );
  });

  it("retorno/sync so ativa depois de consultar o provider", async () => {
    const repo = repository({
      getCurrent: vi.fn().mockResolvedValue(subscription("PENDING")),
    });
    const client = provider();
    const result = await refreshMySubscription(motoboy, repo, client, now);
    expect(client.getSubscription).toHaveBeenCalledWith(providerValue.id);
    expect(repo.updateFromProvider).toHaveBeenCalledWith(
      "subscription-id",
      expect.objectContaining({ status: "authorized" }),
      "ACTIVE",
      now,
    );
    expect(result?.status).toBe("ACTIVE");
  });

  it("sync generico nao limpa PAST_DUE sem pagamento aprovado", async () => {
    const repo = repository({
      getCurrent: vi.fn().mockResolvedValue(subscription("PAST_DUE")),
    });
    const result = await refreshMySubscription(motoboy, repo, provider(), now);
    expect(repo.updateFromProvider).toHaveBeenCalledWith(
      "subscription-id",
      expect.objectContaining({ status: "authorized" }),
      "PAST_DUE",
      now,
    );
    expect(result?.status).toBe("PAST_DUE");
  });

  it("sync generico preserva TRIAL ate evento de cobranca", async () => {
    const repo = repository({
      getCurrent: vi.fn().mockResolvedValue(subscription("TRIAL")),
    });
    const result = await refreshMySubscription(motoboy, repo, provider(), now);
    expect(repo.updateFromProvider).toHaveBeenCalledWith(
      "subscription-id",
      expect.objectContaining({ status: "authorized" }),
      "TRIAL",
      now,
    );
    expect(result?.status).toBe("TRIAL");
  });

  it("ACTIVE libera e estados invalidos bloqueiam somente o gate operacional", async () => {
    await expect(
      assertOperationalSubscription("user-id", repository(), now),
    ).resolves.toBeUndefined();
    await expect(
      assertOperationalSubscription(
        "user-id",
        repository({
          hasOperationalSubscription: vi.fn().mockResolvedValue(false),
        }),
        now,
      ),
    ).rejects.toBeInstanceOf(SubscriptionRequiredError);
  });

  it("preserva RBAC e rejeita ADMIN no checkout", async () => {
    await expect(
      startSubscription(
        { userId: "admin", role: "ADMIN", status: "ACTIVE" },
        { cardTokenId },
        repository(),
        provider(),
        now,
      ),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});
