import { ForbiddenError, UnauthenticatedError } from "@/server/auth/errors";
import { assertAdminAccess } from "@/server/admin/policy";
import { getSubscriptionEnv } from "@/server/config/env";

import {
  SubscriptionConflictError,
  SubscriptionNotFoundError,
  SubscriptionProviderError,
  SubscriptionRequiredError,
} from "./errors";
import {
  cancelSchema,
  checkoutSchema,
  planIdSchema,
  updatePlanSchema,
} from "./schemas";
import type {
  BillableRole,
  ProviderPayment,
  ProviderPlan,
  ProviderSubscription,
  SubscriptionActor,
  SubscriptionPlanRecord,
  SubscriptionProviderClient,
  SubscriptionRecord,
  SubscriptionRepository,
  SubscriptionStatus,
} from "./types";

function requireBillableActor(actor: SubscriptionActor | null) {
  if (!actor) throw new UnauthenticatedError();
  if (
    (actor.role !== "MOTOBOY" && actor.role !== "COMPANY") ||
    actor.status !== "ACTIVE"
  ) {
    throw new ForbiddenError();
  }
  return actor as SubscriptionActor & { role: BillableRole };
}

export function mapProviderStatus(status: string): SubscriptionStatus {
  switch (status.toLowerCase()) {
    case "authorized":
      return "ACTIVE";
    case "paused":
      return "PAUSED";
    case "canceled":
    case "cancelled":
      return "CANCELED";
    case "expired":
      return "EXPIRED";
    default:
      return "PENDING";
  }
}

function statusAfterPayment(
  providerStatus: SubscriptionStatus,
  currentStatus: SubscriptionStatus,
  payment: ProviderPayment | null,
) {
  if (providerStatus !== "ACTIVE") return providerStatus;
  if (!payment) {
    if (currentStatus === "PAST_DUE") return "PAST_DUE";
    if (currentStatus === "TRIAL") return "TRIAL";
    return providerStatus;
  }
  const paymentStatus = payment.status.toLowerCase();
  if (paymentStatus === "approved") return "ACTIVE";
  if (
    ["rejected", "cancelled", "canceled", "refunded", "charged_back"].includes(
      paymentStatus,
    )
  ) {
    return "PAST_DUE";
  }
  return currentStatus === "ACTIVE" ? "ACTIVE" : "PENDING";
}

const iso = (value: Date | null) => value?.toISOString() ?? null;

export function toPlanView(plan: SubscriptionPlanRecord) {
  return {
    id: plan.id,
    role: plan.role,
    name: plan.name,
    description: plan.description,
    monthlyPrice: plan.monthlyPrice,
    active: plan.active,
    trialDays: plan.trialDays,
  };
}

export function toSubscriptionView(subscription: SubscriptionRecord | null) {
  if (!subscription) return null;
  return {
    id: subscription.id,
    status: subscription.status,
    managedByProvider: subscription.providerSubscriptionId !== null,
    canReactivate: subscription.providerStatus?.toLowerCase() === "paused",
    monthlyPrice: subscription.monthlyPrice,
    checkoutUrl: subscription.checkoutUrl,
    currentPeriodStart: iso(subscription.currentPeriodStart),
    currentPeriodEnd: iso(subscription.currentPeriodEnd),
    nextPaymentAt: iso(subscription.nextPaymentAt),
    canceledAt: iso(subscription.canceledAt),
    createdAt: subscription.createdAt.toISOString(),
    plan: toPlanView(subscription.plan),
    events: subscription.events.map((event) => ({
      ...event,
      processedAt: iso(event.processedAt),
      createdAt: event.createdAt.toISOString(),
    })),
    payments: subscription.payments.map((payment) => ({
      id: payment.id,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      paidAt: iso(payment.paidAt),
      createdAt: (payment.providerCreatedAt ?? payment.createdAt).toISOString(),
    })),
  };
}

export async function listPublicPlans(repository: SubscriptionRepository) {
  return (await repository.listPlans())
    .filter((plan) => plan.active)
    .map(toPlanView);
}

export async function getMySubscription(
  actor: SubscriptionActor | null,
  repository: SubscriptionRepository,
) {
  const user = requireBillableActor(actor);
  return {
    plan: toPlanView(
      (await repository.getPlanForRole(user.role)) ??
        (() => {
          throw new SubscriptionNotFoundError();
        })(),
    ),
    subscription: toSubscriptionView(await repository.getLatest(user.userId)),
  };
}

function returnUrl(role: BillableRole) {
  const { NEXT_PUBLIC_APP_URL } = getSubscriptionEnv();
  const area = role === "MOTOBOY" ? "motoboy" : "empresa";
  return `${NEXT_PUBLIC_APP_URL}/app/${area}/assinatura/retorno`;
}

function notificationUrl() {
  return `${getSubscriptionEnv().NEXT_PUBLIC_APP_URL}/api/webhooks/mercadopago?source_news=webhooks`;
}

function expectedProviderPlan(plan: SubscriptionPlanRecord) {
  return {
    reason: `Assinatura mensal Vapor Entregas - ${plan.name}`,
    monthlyPrice: plan.monthlyPrice,
    trialDays: plan.trialDays,
    backUrl: returnUrl(plan.role),
  };
}

function providerPlanMatches(
  providerPlan: ProviderPlan,
  expected: ReturnType<typeof expectedProviderPlan>,
) {
  return (
    providerPlan.reason === expected.reason &&
    Math.abs(providerPlan.amount - expected.monthlyPrice) < 0.001 &&
    providerPlan.currency === "BRL" &&
    providerPlan.frequency === 1 &&
    providerPlan.frequencyType === "months" &&
    providerPlan.trialDays === expected.trialDays &&
    providerPlan.backUrl === expected.backUrl &&
    !["inactive", "canceled", "cancelled"].includes(
      providerPlan.status?.toLowerCase() ?? "active",
    )
  );
}

function providerPlanBillingMatches(
  providerPlan: ProviderPlan,
  expected: ReturnType<typeof expectedProviderPlan>,
) {
  return (
    Math.abs(providerPlan.amount - expected.monthlyPrice) < 0.001 &&
    providerPlan.currency === "BRL" &&
    providerPlan.frequency === 1 &&
    providerPlan.frequencyType === "months" &&
    !["inactive", "canceled", "cancelled"].includes(
      providerPlan.status?.toLowerCase() ?? "active",
    )
  );
}

export async function ensureProviderPlan(
  plan: SubscriptionPlanRecord,
  repository: SubscriptionRepository,
  provider: SubscriptionProviderClient,
) {
  const { MERCADO_PAGO_MODE } = getSubscriptionEnv();
  const expected = expectedProviderPlan(plan);
  let providerPlan: ProviderPlan | null = null;
  if (plan.externalPlanId && plan.externalPlanMode === MERCADO_PAGO_MODE) {
    try {
      providerPlan = await provider.getPlan(plan.externalPlanId);
    } catch (error) {
      if (
        !(error instanceof SubscriptionProviderError) ||
        error.providerStatus !== 404
      ) {
        throw error;
      }
    }
    if (providerPlan && !providerPlanBillingMatches(providerPlan, expected)) {
      providerPlan = null;
    } else if (providerPlan && providerPlan.trialDays !== expected.trialDays) {
      providerPlan = null;
    } else if (providerPlan && !providerPlanMatches(providerPlan, expected)) {
      providerPlan = await provider.updatePlan(providerPlan.id, expected);
    }
  }
  if (!providerPlan) {
    providerPlan = await provider.createPlan({
      ...expected,
      idempotencyKey: `plan:${MERCADO_PAGO_MODE}:${plan.id}:${plan.monthlyPrice.toFixed(2)}:${plan.externalPlanId ?? "initial"}`,
    });
  }
  if (!providerPlanMatches(providerPlan, expected)) {
    throw new SubscriptionConflictError(
      "O plano retornado pelo provedor diverge da configuracao interna.",
    );
  }
  await repository.saveProviderPlan(
    plan.id,
    providerPlan.id,
    MERCADO_PAGO_MODE,
  );
  return providerPlan.id;
}

async function ensureProviderPlanWithoutTrial(
  plan: SubscriptionPlanRecord,
  provider: SubscriptionProviderClient,
) {
  const { MERCADO_PAGO_MODE } = getSubscriptionEnv();
  const expected = { ...expectedProviderPlan(plan), trialDays: 0 };
  const providerPlan = await provider.createPlan({
    ...expected,
    idempotencyKey: `plan:${MERCADO_PAGO_MODE}:${plan.id}:${plan.monthlyPrice.toFixed(2)}:without-trial`,
  });
  if (!providerPlanMatches(providerPlan, expected)) {
    throw new SubscriptionConflictError(
      "O plano sem teste retornado pelo provedor diverge da configuracao interna.",
    );
  }
  return providerPlan.id;
}

export async function synchronizeProviderPlans(
  actor: SubscriptionActor | null,
  repository: SubscriptionRepository,
  provider: SubscriptionProviderClient,
) {
  assertAdminAccess(actor);
  const plans = (await repository.listPlans()).filter((plan) => plan.active);
  for (const plan of plans) {
    await ensureProviderPlan(plan, repository, provider);
  }
  return plans.map(toPlanView);
}

async function synchronize(
  subscription: SubscriptionRecord,
  providerValue: ProviderSubscription,
  repository: SubscriptionRepository,
  now: Date,
) {
  const mappedStatus = mapProviderStatus(providerValue.status);
  const synchronizedStatus =
    mappedStatus === "ACTIVE" && subscription.status === "TRIAL"
      ? "TRIAL"
      : mappedStatus === "ACTIVE" && subscription.status === "PAST_DUE"
        ? "PAST_DUE"
        : mappedStatus;
  return repository.updateFromProvider(
    subscription.id,
    providerValue,
    synchronizedStatus,
    now,
  );
}

export async function startSubscription(
  actor: SubscriptionActor | null,
  input: unknown,
  repository: SubscriptionRepository,
  provider: SubscriptionProviderClient,
  now: Date,
) {
  const checkout = checkoutSchema.parse(input);
  const user = requireBillableActor(actor);
  const billingUser = await repository.getBillingUser(user.userId);
  if (
    !billingUser ||
    billingUser.id !== user.userId ||
    billingUser.role !== user.role ||
    billingUser.status !== "ACTIVE"
  ) {
    throw new ForbiddenError();
  }
  const plan = await repository.getPlanForRole(user.role);
  if (!plan?.active) throw new SubscriptionNotFoundError();
  let current = await repository.getCurrent(user.userId);
  if (
    current?.status === "TRIAL" &&
    current.currentPeriodEnd &&
    current.currentPeriodEnd <= now
  ) {
    await repository.expireDraft(current.id, now);
    current = null;
  }
  let draft: SubscriptionRecord | null = null;
  if (current) {
    if (current.status === "PENDING" && !current.providerSubscriptionId) {
      draft = current;
    } else {
      return toSubscriptionView(current);
    }
  }

  const eligibleForTrial =
    plan.trialDays > 0 &&
    !(await repository.hasPriorSubscription(user.userId, draft?.id ?? null));
  const providerPlanId = eligibleForTrial
    ? await ensureProviderPlan(plan, repository, provider)
    : plan.trialDays > 0
      ? await ensureProviderPlanWithoutTrial(plan, provider)
      : await ensureProviderPlan(plan, repository, provider);
  draft ??= await repository.createDraft(user.userId, plan, now);
  if (!draft.externalReference) {
    await repository.expireDraft(draft.id, now);
    throw new SubscriptionConflictError("Referencia externa ausente.");
  }
  const providerValue = await provider.createAuthorized({
    providerPlanId,
    cardTokenId: checkout.cardTokenId,
    clientDiagnostics: checkout.clientDiagnostics,
    externalReference: draft.externalReference,
    payerEmail: billingUser.email,
    reason: `Assinatura mensal Vapor Entregas - ${plan.name}`,
    backUrl: returnUrl(user.role),
    notificationUrl: notificationUrl(),
  });
  if (
    providerValue.externalReference !== draft.externalReference ||
    (providerValue.planId && providerValue.planId !== providerPlanId)
  ) {
    throw new SubscriptionConflictError(
      "O provedor retornou uma correlacao incompatível.",
    );
  }
  return toSubscriptionView(
    await repository.attachProvider(
      draft.id,
      eligibleForTrial
        ? {
            ...providerValue,
            currentPeriodEnd:
              providerValue.nextPaymentAt ??
              new Date(now.getTime() + plan.trialDays * 86_400_000),
          }
        : providerValue,
      eligibleForTrial ? "TRIAL" : mapProviderStatus(providerValue.status),
    ),
  );
}

export async function refreshMySubscription(
  actor: SubscriptionActor | null,
  repository: SubscriptionRepository,
  provider: SubscriptionProviderClient,
  now: Date,
) {
  const user = requireBillableActor(actor);
  const current = await repository.getCurrent(user.userId);
  if (!current?.providerSubscriptionId) {
    return toSubscriptionView(
      current ?? (await repository.getLatest(user.userId)),
    );
  }
  return toSubscriptionView(
    await synchronize(
      current,
      await provider.getSubscription(current.providerSubscriptionId),
      repository,
      now,
    ),
  );
}

export async function cancelMySubscription(
  actor: SubscriptionActor | null,
  input: unknown,
  repository: SubscriptionRepository,
  provider: SubscriptionProviderClient,
  now: Date,
) {
  cancelSchema.parse(input);
  const user = requireBillableActor(actor);
  const current = await repository.getCurrent(user.userId);
  if (!current) throw new SubscriptionNotFoundError();
  if (current.userId !== user.userId) throw new ForbiddenError();
  if (!current.providerSubscriptionId) {
    return toSubscriptionView(await repository.cancelLocal(current.id, now));
  }
  const providerValue = await provider.cancelSubscription(
    current.providerSubscriptionId,
  );
  if (
    providerValue.id !== current.providerSubscriptionId ||
    mapProviderStatus(providerValue.status) !== "CANCELED"
  ) {
    throw new SubscriptionConflictError(
      "O provedor ainda nao confirmou o cancelamento.",
    );
  }
  await repository.applyProviderEvent({
    providerEventId: `local:cancel:${current.id}:${now.toISOString()}`,
    eventType: "subscription.cancel.requested",
    subscriptionId: current.id,
    providerResourceId: providerValue.id,
    providerStatus: providerValue.status,
    providerSubscription: providerValue,
    subscriptionStatus: "CANCELED",
    payment: null,
    processedAt: now,
  });
  return toSubscriptionView(await repository.findById(current.id));
}

export async function reactivateMySubscription(
  actor: SubscriptionActor | null,
  repository: SubscriptionRepository,
  provider: SubscriptionProviderClient,
  now: Date,
) {
  const user = requireBillableActor(actor);
  const current = await repository.getCurrent(user.userId);
  if (
    !current?.providerSubscriptionId ||
    current.providerStatus?.toLowerCase() !== "paused"
  ) {
    throw new SubscriptionConflictError(
      "Somente uma assinatura pausada pode ser reativada.",
    );
  }
  return toSubscriptionView(
    await synchronize(
      current,
      await provider.reactivateSubscription(current.providerSubscriptionId),
      repository,
      now,
    ),
  );
}

async function findCorrelatedSubscription(
  repository: SubscriptionRepository,
  providerSubscriptionId: string | null,
  externalReference: string | null,
) {
  let subscription = providerSubscriptionId
    ? await repository.findByProviderId(providerSubscriptionId)
    : null;
  if (!subscription && externalReference) {
    subscription = await repository.findByExternalReference(externalReference);
    if (!subscription && /^[0-9a-f-]{36}$/i.test(externalReference)) {
      subscription = await repository.findById(externalReference);
    }
  }
  return subscription;
}

export async function processMercadoPagoWebhook(
  webhook: {
    eventId: string;
    type: string;
    action: string | null;
    resourceId: string;
  },
  repository: SubscriptionRepository,
  provider: SubscriptionProviderClient,
  now: Date,
) {
  let providerValue: ProviderSubscription | null = null;
  let payment: ProviderPayment | null = null;
  let providerSubscriptionId: string | null = null;

  if (webhook.type === "subscription_preapproval") {
    providerSubscriptionId = webhook.resourceId;
    providerValue = await provider.getSubscription(providerSubscriptionId);
  } else if (webhook.type === "subscription_authorized_payment") {
    payment = await provider.getAuthorizedPayment(webhook.resourceId);
    providerSubscriptionId = payment.subscriptionId;
    if (providerSubscriptionId) {
      providerValue = await provider.getSubscription(providerSubscriptionId);
    }
  } else if (webhook.type === "payment") {
    payment = await provider.getPayment(webhook.resourceId);
    providerSubscriptionId = payment.subscriptionId;
    if (providerSubscriptionId) {
      providerValue = await provider.getSubscription(providerSubscriptionId);
    }
  } else {
    return repository.applyProviderEvent({
      providerEventId: webhook.eventId,
      eventType: webhook.type,
      subscriptionId: null,
      providerResourceId: webhook.resourceId,
      providerStatus: null,
      providerSubscription: null,
      subscriptionStatus: null,
      payment: null,
      processedAt: now,
    });
  }

  const externalReference =
    providerValue?.externalReference ?? payment?.externalReference ?? null;
  const subscription = await findCorrelatedSubscription(
    repository,
    providerSubscriptionId,
    externalReference,
  );
  if (!providerValue && subscription?.providerSubscriptionId) {
    providerValue = await provider.getSubscription(
      subscription.providerSubscriptionId,
    );
    providerSubscriptionId = providerValue.id;
  }
  if (subscription && externalReference) {
    const validReferences = [subscription.id, subscription.externalReference];
    if (!validReferences.includes(externalReference)) {
      throw new SubscriptionConflictError(
        "A correlacao do webhook diverge da assinatura local.",
      );
    }
  }
  if (
    subscription &&
    providerValue?.planId &&
    subscription.providerPlanId &&
    providerValue.planId !== subscription.providerPlanId
  ) {
    throw new SubscriptionConflictError(
      "O plano do webhook diverge da assinatura local.",
    );
  }
  if (
    subscription &&
    payment &&
    (payment.currency !== "BRL" ||
      Math.abs(payment.amount - subscription.monthlyPrice) >= 0.001)
  ) {
    throw new SubscriptionConflictError(
      "A cobranca do webhook diverge da assinatura local.",
    );
  }
  const providerStatus = providerValue
    ? mapProviderStatus(providerValue.status)
    : null;
  const subscriptionStatus =
    subscription && providerStatus
      ? statusAfterPayment(providerStatus, subscription.status, payment)
      : providerStatus;
  return repository.applyProviderEvent({
    providerEventId: webhook.eventId,
    eventType: webhook.action
      ? `${webhook.type}:${webhook.action}`
      : webhook.type,
    subscriptionId: subscription?.id ?? null,
    providerResourceId: webhook.resourceId,
    providerStatus: providerValue?.status ?? null,
    providerSubscription: subscription ? providerValue : null,
    subscriptionStatus: subscription ? subscriptionStatus : null,
    payment: subscription ? payment : null,
    processedAt: now,
  });
}

export async function assertOperationalSubscription(
  userId: string,
  repository: SubscriptionRepository,
  now = new Date(),
) {
  if (!(await repository.hasOperationalSubscription(userId, now))) {
    throw new SubscriptionRequiredError();
  }
}

export async function updateSubscriptionPlan(
  actor: SubscriptionActor | null,
  planId: unknown,
  input: unknown,
  repository: SubscriptionRepository,
  now: Date,
) {
  assertAdminAccess(actor);
  const id = planIdSchema.parse(planId);
  const validated = updatePlanSchema.parse(input);
  const plan = await repository.updatePlan(actor.userId, id, validated, now);
  if (!plan) throw new SubscriptionNotFoundError();
  return toPlanView(plan);
}
