import { randomUUID } from "node:crypto";

import { ForbiddenError, UnauthenticatedError } from "@/server/auth/errors";
import { getSubscriptionEnv } from "@/server/config/env";
import { logMercadoPagoPaymentDiagnostic } from "@/server/observability/logger";
import {
  SubscriptionConflictError,
  SubscriptionNotFoundError,
  SubscriptionProviderError,
} from "@/server/subscriptions/errors";
import { toSubscriptionView } from "@/server/subscriptions/subscription-service";
import type {
  BillableRole,
  SubscriptionRepository,
} from "@/server/subscriptions/types";

import { paymentCheckoutSchema } from "./schemas";
import type {
  PaymentActor,
  PaymentAttemptRecord,
  PaymentAttemptStatus,
  PaymentProviderClient,
  PaymentRepository,
  ProviderOneOffPayment,
} from "./types";

function requireActor(actor: PaymentActor | null) {
  if (!actor) throw new UnauthenticatedError();
  if (
    (actor.role !== "MOTOBOY" && actor.role !== "COMPANY") ||
    actor.status !== "ACTIVE"
  ) {
    throw new ForbiddenError();
  }
  return actor as PaymentActor & { role: BillableRole };
}

export function mapPaymentStatus(status: string): PaymentAttemptStatus {
  switch (status.trim().toLowerCase()) {
    case "approved":
      return "APPROVED";
    case "pending":
    case "in_process":
    case "in_mediation":
      return "PENDING";
    case "rejected":
      return "REJECTED";
    case "cancelled":
    case "canceled":
      return "CANCELLED";
    case "refunded":
    case "charged_back":
      return "REFUNDED";
    case "expired":
      return "EXPIRED";
    default:
      return "ERROR";
  }
}

function validatePayment(
  payment: ProviderOneOffPayment,
  attempt: PaymentAttemptRecord,
  expected: {
    userId: string;
    planId: string;
    role: BillableRole;
    amount: number;
  },
) {
  if (
    payment.externalReference !== attempt.externalReference ||
    payment.internalPaymentId !== attempt.id ||
    payment.userId !== expected.userId ||
    payment.planId !== expected.planId ||
    payment.role !== expected.role ||
    payment.currency !== "BRL" ||
    Math.abs(payment.amount - expected.amount) >= 0.001
  ) {
    throw new SubscriptionConflictError(
      "A confirmação do pagamento diverge da cobrança local.",
    );
  }
}

function credentialEnvironment(value: string | undefined) {
  if (value?.startsWith("TEST-")) return "test" as const;
  if (value?.startsWith("APP_USR-")) return "production" as const;
  return "unknown" as const;
}

function applicationId(value: string | undefined) {
  return /^(?:TEST|APP_USR)-(\d+)-/.exec(value ?? "")?.[1] ?? null;
}

function assertCredentialCoherence() {
  const env = getSubscriptionEnv();
  const publicKey = env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY;
  const accessToken = env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!publicKey || !accessToken) {
    throw new SubscriptionProviderError({ providerCode: "NOT_CONFIGURED" });
  }
  const publicIsTest = publicKey.startsWith("TEST-");
  const tokenIsTest = accessToken.startsWith("TEST-");
  const detectedMismatch = publicIsTest !== tokenIsTest;
  const modeMismatch =
    (env.MERCADO_PAGO_MODE === "test" && (!publicIsTest || !tokenIsTest)) ||
    (env.MERCADO_PAGO_MODE === "production" && (publicIsTest || tokenIsTest));
  const publicApplication = applicationId(publicKey);
  const serverApplication = applicationId(accessToken);
  if (
    detectedMismatch ||
    modeMismatch ||
    (publicApplication &&
      serverApplication &&
      publicApplication !== serverApplication)
  ) {
    throw new SubscriptionProviderError({
      providerCode: "LOCAL_CREDENTIAL_ENVIRONMENT_MISMATCH",
    });
  }
}

function logPayment(
  paymentMethod: "pix" | "credit_card",
  payment: ProviderOneOffPayment,
  accessGranted: boolean,
) {
  const env = getSubscriptionEnv();
  const publicApplication = applicationId(
    env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY,
  );
  const serverApplication = applicationId(env.MERCADO_PAGO_ACCESS_TOKEN);
  const publicEnvironment = credentialEnvironment(
    env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY,
  );
  const accessTokenEnvironment = credentialEnvironment(
    env.MERCADO_PAGO_ACCESS_TOKEN,
  );
  logMercadoPagoPaymentDiagnostic({
    mode: env.MERCADO_PAGO_MODE,
    publicKeyConfigured: Boolean(env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY),
    accessTokenConfigured: Boolean(env.MERCADO_PAGO_ACCESS_TOKEN),
    publicKeyEnvironment: publicEnvironment,
    accessTokenEnvironment,
    credentialsMatch:
      publicApplication && serverApplication
        ? publicApplication === serverApplication
        : publicEnvironment !== "unknown" &&
            accessTokenEnvironment !== "unknown"
          ? publicEnvironment === accessTokenEnvironment
          : null,
    paymentMethod,
    paymentIdPresent: Boolean(payment.id),
    providerStatus: payment.status,
    providerStatusDetail: payment.statusDetail,
    accessGranted,
  });
}

function paymentView(
  attempt: PaymentAttemptRecord,
  payment: ProviderOneOffPayment,
) {
  return {
    id: attempt.id,
    status: mapPaymentStatus(payment.status),
    paymentMethod: payment.paymentMethod,
    amount: attempt.amount,
    currency: attempt.currency,
    paidAt: payment.paidAt?.toISOString() ?? null,
    expiresAt: payment.expiresAt?.toISOString() ?? null,
    pix: payment.pix,
  };
}

async function confirmAndApply(
  attempt: PaymentAttemptRecord,
  expected: {
    userId: string;
    planId: string;
    role: BillableRole;
    amount: number;
  },
  providerPayment: ProviderOneOffPayment,
  eventId: string,
  eventType: string,
  repository: PaymentRepository,
  now: Date,
) {
  validatePayment(providerPayment, attempt, expected);
  const status = mapPaymentStatus(providerPayment.status);
  await repository.attachProviderPayment(attempt.id, providerPayment, status);
  const result = await repository.applyConfirmedPayment({
    eventId,
    eventType,
    attemptId: attempt.id,
    payment: providerPayment,
    status,
    processedAt: now,
  });
  logPayment(
    providerPayment.paymentMethod === "pix" ? "pix" : "credit_card",
    providerPayment,
    result === "access_granted",
  );
  return result;
}

export async function createAccessPayment(
  actor: PaymentActor | null,
  input: unknown,
  subscriptions: SubscriptionRepository,
  payments: PaymentRepository,
  provider: PaymentProviderClient,
  now = new Date(),
) {
  const user = requireActor(actor);
  const checkout = paymentCheckoutSchema.parse(input);
  const billingUser = await subscriptions.getBillingUser(user.userId);
  if (
    !billingUser ||
    billingUser.id !== user.userId ||
    billingUser.role !== user.role ||
    billingUser.status !== "ACTIVE"
  ) {
    throw new ForbiddenError();
  }
  const plan = await subscriptions.getPlanForRole(user.role);
  if (!plan?.active) throw new SubscriptionNotFoundError();
  assertCredentialCoherence();

  let subscription = await subscriptions.getCurrent(user.userId);
  if (subscription?.providerSubscriptionId) {
    throw new SubscriptionConflictError(
      "Esta conta ainda possui uma assinatura recorrente legada. Cancele-a antes de comprar um novo período.",
    );
  }
  subscription ??= await subscriptions.createDraft(user.userId, plan, now);
  if (subscription.userId !== user.userId || subscription.planId !== plan.id) {
    throw new ForbiddenError();
  }

  const id = randomUUID();
  const externalReference = `payment:${id}`;
  const { attempt } = await payments.createAttempt({
    id,
    subscription,
    userId: user.userId,
    planId: plan.id,
    idempotencyKey: checkout.attemptId,
    externalReference,
    amount: plan.monthlyPrice,
    now,
  });

  try {
    let providerPayment = attempt.providerPaymentId
      ? await provider.getPayment(attempt.providerPaymentId)
      : await provider.createPayment({
          idempotencyKey: checkout.attemptId,
          internalPaymentId: attempt.id,
          userId: user.userId,
          planId: plan.id,
          role: user.role,
          amount: plan.monthlyPrice,
          description: `Vapor Entregas - 30 dias - Plano ${plan.name}`,
          externalReference: attempt.externalReference ?? externalReference,
          payerEmail: billingUser.email,
          paymentMethodId: checkout.formData.payment_method_id,
          token: checkout.formData.token ?? null,
          issuerId: checkout.formData.issuer_id
            ? String(checkout.formData.issuer_id)
            : null,
          installments: checkout.formData.installments ?? null,
          identification: checkout.formData.payer?.identification ?? null,
          notificationUrl: `${getSubscriptionEnv().NEXT_PUBLIC_APP_URL}/api/webhooks/mercadopago?source_news=webhooks`,
        });

    // The create response is not trusted as the final source of truth.
    providerPayment = await provider.getPayment(providerPayment.id);
    await confirmAndApply(
      attempt,
      {
        userId: user.userId,
        planId: plan.id,
        role: user.role,
        amount: plan.monthlyPrice,
      },
      providerPayment,
      `local:payment:${providerPayment.id}:${providerPayment.status}`,
      "payment.created.confirmed",
      payments,
      now,
    );
    return {
      payment: paymentView(attempt, providerPayment),
      subscription: toSubscriptionView(
        await subscriptions.findById(subscription.id),
      ),
    };
  } catch (error) {
    await payments.markAttemptError(attempt.id);
    throw error;
  }
}

export async function refreshAccessPayment(
  actor: PaymentActor | null,
  paymentId: string,
  subscriptions: SubscriptionRepository,
  payments: PaymentRepository,
  provider: PaymentProviderClient,
  now = new Date(),
) {
  const user = requireActor(actor);
  const attempt = await payments.findAttemptById(paymentId);
  if (!attempt || attempt.userId !== user.userId)
    throw new SubscriptionNotFoundError();
  if (!attempt.providerPaymentId || !attempt.planId) {
    throw new SubscriptionConflictError(
      "Pagamento ainda não enviado ao provedor.",
    );
  }
  const plan = await subscriptions.getPlanForRole(user.role);
  if (!plan || plan.id !== attempt.planId) throw new ForbiddenError();
  const providerPayment = await provider.getPayment(attempt.providerPaymentId);
  if (providerPayment.id !== attempt.providerPaymentId) {
    throw new SubscriptionConflictError(
      "O identificador confirmado pelo provedor diverge do pagamento local.",
    );
  }
  await confirmAndApply(
    attempt,
    {
      userId: user.userId,
      planId: plan.id,
      role: user.role,
      amount: plan.monthlyPrice,
    },
    providerPayment,
    `local:payment-refresh:${providerPayment.id}:${providerPayment.status}`,
    "payment.refreshed",
    payments,
    now,
  );
  return {
    payment: paymentView(attempt, providerPayment),
    subscription: toSubscriptionView(
      await subscriptions.findById(attempt.subscriptionId),
    ),
  };
}

export async function processAccessPaymentWebhook(
  webhook: { eventId: string; action: string | null; resourceId: string },
  subscriptions: SubscriptionRepository,
  payments: PaymentRepository,
  provider: PaymentProviderClient,
  now = new Date(),
) {
  const providerPayment = await provider.getPayment(webhook.resourceId);
  if (providerPayment.id !== webhook.resourceId) {
    throw new SubscriptionConflictError(
      "O recurso confirmado pelo provedor diverge da notificação.",
    );
  }
  let attempt = await payments.findAttemptByProviderId(providerPayment.id);
  if (!attempt && providerPayment.externalReference) {
    attempt = await payments.findAttemptByExternalReference(
      providerPayment.externalReference,
    );
  }
  if (!attempt?.userId || !attempt.planId) {
    throw new SubscriptionNotFoundError();
  }
  const subscription = await subscriptions.findById(attempt.subscriptionId);
  if (!subscription || subscription.userId !== attempt.userId) {
    throw new SubscriptionConflictError(
      "Correlação local do pagamento inválida.",
    );
  }
  return confirmAndApply(
    attempt,
    {
      userId: attempt.userId,
      planId: attempt.planId,
      role: subscription.plan.role,
      amount: subscription.plan.monthlyPrice,
    },
    providerPayment,
    webhook.eventId,
    webhook.action ? `payment:${webhook.action}` : "payment",
    payments,
    now,
  );
}
