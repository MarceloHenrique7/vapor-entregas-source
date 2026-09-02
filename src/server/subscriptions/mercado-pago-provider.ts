import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

import { z } from "zod";

import { getSubscriptionEnv } from "@/server/config/env";
import {
  logMercadoPagoPayerDiagnostic,
  logMercadoPagoPlanDiagnostic,
  logMercadoPagoPreapprovalPayloadDiagnostic,
  logMercadoPagoSubscriptionDiagnostic,
} from "@/server/observability/logger";

import {
  SubscriptionProviderError,
  SubscriptionProviderNotConfiguredError,
} from "./errors";
import type {
  ProviderPayment,
  ProviderPlan,
  ProviderSubscription,
  MercadoPagoClientDiagnostics,
  MercadoPagoCredentialEnvironment,
  SubscriptionProviderClient,
} from "./types";

type ProviderResponseBody = Record<string, unknown>;

const numberValue = z.union([z.number(), z.string()]).transform(Number);
const optionalDate = z.string().nullable().optional();

const planSchema = z
  .object({
    id: z.union([z.string(), z.number()]),
    application_id: z.union([z.string(), z.number()]).nullable().optional(),
    collector_id: z.union([z.string(), z.number()]).nullable().optional(),
    reason: z.string(),
    status: z.string().nullable().optional(),
    back_url: z.string().nullable().optional(),
    auto_recurring: z.object({
      frequency: numberValue,
      frequency_type: z.string(),
      transaction_amount: numberValue,
      currency_id: z.string(),
      free_trial: z
        .object({
          frequency: numberValue,
          frequency_type: z.string(),
        })
        .nullable()
        .optional(),
    }),
  })
  .passthrough();

const planSearchSchema = z
  .object({
    results: z.array(planSchema).default([]),
  })
  .passthrough();

const subscriptionSchema = z
  .object({
    id: z.union([z.string(), z.number()]),
    status: z.string(),
    init_point: z.string().url().nullable().optional(),
    external_reference: z.string().nullable().optional(),
    preapproval_plan_id: z
      .union([z.string(), z.number()])
      .nullable()
      .optional(),
    next_payment_date: optionalDate,
    auto_recurring: z
      .object({
        start_date: optionalDate,
        end_date: optionalDate,
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

const authorizedPaymentSchema = z
  .object({
    id: z.union([z.string(), z.number()]),
    preapproval_id: z.union([z.string(), z.number()]),
    external_reference: z.union([z.string(), z.number()]).nullable().optional(),
    transaction_amount: numberValue,
    currency_id: z.string(),
    status: z.string(),
    summarized: z.string().nullable().optional(),
    date_created: optionalDate,
    payment: z
      .object({
        id: z.union([z.string(), z.number()]),
        status: z.string(),
      })
      .nullable()
      .optional(),
  })
  .passthrough();

const paymentSchema = z
  .object({
    id: z.union([z.string(), z.number()]),
    status: z.string(),
    transaction_amount: numberValue,
    currency_id: z.string().default("BRL"),
    date_approved: optionalDate,
    date_created: optionalDate,
    external_reference: z.union([z.string(), z.number()]).nullable().optional(),
    metadata: z
      .object({
        preapproval_id: z.union([z.string(), z.number()]).nullable().optional(),
        subscription_id: z
          .union([z.string(), z.number()])
          .nullable()
          .optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

const sellerAccountSchema = z
  .object({
    id: z.union([z.string(), z.number()]),
    email: z.string().trim().email().nullable().optional(),
    site_id: z.string().trim().nullable().optional(),
    test_user: z.boolean().nullable().optional(),
  })
  .passthrough();

function normalizedEmail(value: string) {
  return value.trim().toLowerCase();
}

function emailDomain(value: string) {
  const normalized = normalizedEmail(value);
  const separator = normalized.lastIndexOf("@");
  return separator > 0 && separator < normalized.length - 1
    ? normalized.slice(separator + 1)
    : null;
}

function toDate(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new SubscriptionProviderError();
  return parsed;
}

function safeCheckoutUrl(value: string | null | undefined) {
  if (!value) return null;
  const url = new URL(value);
  const allowedHost =
    url.hostname === "mercadopago.com.br" ||
    url.hostname.endsWith(".mercadopago.com.br") ||
    url.hostname === "mercadopago.com" ||
    url.hostname.endsWith(".mercadopago.com");
  if (url.protocol !== "https:" || !allowedHost) {
    throw new SubscriptionProviderError();
  }
  return url.toString();
}

function parse<T>(schema: z.ZodType<T>, raw: unknown): T {
  const result = schema.safeParse(raw);
  if (!result.success) throw new SubscriptionProviderError();
  return result.data;
}

function isProviderResponseBody(value: unknown): value is ProviderResponseBody {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringField(value: unknown) {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number") return String(value);
  return null;
}

function firstProviderCause(body: ProviderResponseBody) {
  const cause = body.cause;
  if (!Array.isArray(cause)) return null;
  return cause.find(isProviderResponseBody) ?? null;
}

function providerDiagnostics(body: unknown) {
  if (!isProviderResponseBody(body)) {
    return {
      providerCode: null,
      providerMessage: null,
      providerCause: null,
    };
  }
  const firstCause = firstProviderCause(body);
  return {
    providerCode:
      stringField(body.error) ??
      stringField(body.code) ??
      stringField(firstCause?.code),
    providerMessage:
      stringField(body.message) ?? stringField(firstCause?.description),
    providerCause: body.cause ?? null,
  };
}

function freeTrial(trialDays: number) {
  return trialDays > 0
    ? {
        free_trial: {
          frequency: trialDays,
          frequency_type: "days",
        },
      }
    : {};
}

function endpointPath(path: string) {
  return path.split(/[?#]/, 1)[0] || "/";
}

function maskedProviderId(value: string) {
  if (value.length <= 10) return `${value.slice(0, 2)}***${value.slice(-2)}`;
  return `${value.slice(0, 6)}***${value.slice(-4)}`;
}

function credentialClassification(value: string | undefined): {
  prefix: "TEST" | "APP_USR" | "unknown" | "not_configured";
  environment: MercadoPagoCredentialEnvironment;
} {
  if (!value) return { prefix: "not_configured", environment: "unknown" };
  if (value.startsWith("TEST-")) {
    return { prefix: "TEST", environment: "test" };
  }
  if (value.startsWith("APP_USR-")) {
    // Mercado Pago also issues APP_USR credentials to test sellers. The
    // prefix alone cannot prove whether a credential is test or production.
    return { prefix: "APP_USR", environment: "unknown" };
  }
  return { prefix: "unknown", environment: "unknown" };
}

function publicKeyBuildMatchesRuntime(
  clientDiagnostics: MercadoPagoClientDiagnostics | undefined,
  runtimePublicKey: string | undefined,
) {
  if (!clientDiagnostics?.publicKeyHash || !runtimePublicKey) return null;
  const clientHash = Buffer.from(clientDiagnostics.publicKeyHash, "hex");
  const runtimeHash = createHash("sha256").update(runtimePublicKey).digest();
  return (
    clientHash.length === runtimeHash.length &&
    timingSafeEqual(clientHash, runtimeHash)
  );
}

function credentialApplicationId(value: string | undefined) {
  const match = /^(?:TEST|APP_USR)-(\d+)-/.exec(value ?? "");
  return match?.[1] ?? null;
}

function providerRequestId(headers: Headers) {
  return (
    headers.get("x-request-id") ??
    headers.get("x-correlation-id") ??
    headers.get("x-meli-request-id") ??
    null
  );
}

function toProviderPlan(
  raw: unknown,
  accessToken: string | undefined,
): ProviderPlan {
  const value = parse(planSchema, raw);
  const applicationId = value.application_id
    ? String(value.application_id)
    : null;
  const currentApplicationId = credentialApplicationId(accessToken);
  return {
    id: String(value.id),
    applicationId,
    collectorId: value.collector_id ? String(value.collector_id) : null,
    belongsToCurrentApplication:
      applicationId && currentApplicationId
        ? applicationId === currentApplicationId
        : null,
    reason: value.reason,
    amount: value.auto_recurring.transaction_amount,
    currency: value.auto_recurring.currency_id,
    frequency: value.auto_recurring.frequency,
    frequencyType: value.auto_recurring.frequency_type,
    trialDays:
      value.auto_recurring.free_trial?.frequency_type === "days"
        ? value.auto_recurring.free_trial.frequency
        : 0,
    status: value.status ?? null,
    backUrl: value.back_url ?? null,
  };
}

function toProviderSubscription(raw: unknown): ProviderSubscription {
  const value = parse(subscriptionSchema, raw);
  return {
    id: String(value.id),
    status: value.status,
    checkoutUrl: safeCheckoutUrl(value.init_point),
    externalReference: value.external_reference ?? null,
    currentPeriodStart: toDate(value.auto_recurring?.start_date),
    currentPeriodEnd: toDate(value.auto_recurring?.end_date),
    nextPaymentAt: toDate(value.next_payment_date),
    planId: value.preapproval_plan_id
      ? String(value.preapproval_plan_id)
      : null,
  };
}

function toProviderPayment(raw: unknown): ProviderPayment {
  const value = parse(paymentSchema, raw);
  return {
    authorizedPaymentId: null,
    paymentId: String(value.id),
    subscriptionId: value.metadata?.preapproval_id
      ? String(value.metadata.preapproval_id)
      : value.metadata?.subscription_id
        ? String(value.metadata.subscription_id)
        : null,
    externalReference: value.external_reference
      ? String(value.external_reference)
      : null,
    amount: value.transaction_amount,
    currency: value.currency_id,
    status: value.status,
    paidAt: toDate(value.date_approved),
    createdAt: toDate(value.date_created),
  };
}

export class MercadoPagoSubscriptionProvider implements SubscriptionProviderClient {
  async getSellerAccount() {
    return this.request("/users/me", undefined, (raw) => {
      const value = parse(sellerAccountSchema, raw);
      return {
        id: String(value.id),
        email: value.email ? normalizedEmail(value.email) : null,
        siteId: value.site_id ?? null,
        testUser: value.test_user ?? null,
      };
    });
  }

  private async lookupSellerAccount() {
    try {
      return await this.getSellerAccount();
    } catch {
      // This lookup is diagnostic and provider failures are handled by the
      // actual checkout request below.
      return null;
    }
  }

  private async request<T>(
    path: string,
    init: RequestInit | undefined,
    transform: (raw: unknown) => T,
  ) {
    const env = getSubscriptionEnv();
    if (!env.MERCADO_PAGO_ACCESS_TOKEN) {
      throw new SubscriptionProviderNotConfiguredError();
    }
    const endpoint = endpointPath(path);
    const method = init?.method?.toUpperCase() ?? "GET";
    let response: Response;
    try {
      response = await fetch(`${env.MERCADO_PAGO_API_BASE_URL}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${env.MERCADO_PAGO_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
          ...init?.headers,
        },
        cache: "no-store",
        signal: AbortSignal.timeout(12_000),
      });
    } catch (cause) {
      throw new SubscriptionProviderError({
        providerCause: cause,
        endpoint,
        method,
      });
    }
    let responseBody: unknown;
    let responseText = "";
    try {
      responseText = await response.text();
      responseBody = responseText ? JSON.parse(responseText) : null;
    } catch (cause) {
      throw new SubscriptionProviderError({
        providerStatus: response.status,
        providerCode: "INVALID_RESPONSE",
        providerMessage: "A resposta do provedor não contém JSON válido.",
        providerCause: cause,
        endpoint,
        method,
        responseBody: responseText || null,
        providerRequestId: providerRequestId(response.headers),
      });
    }
    if (!response.ok) {
      throw new SubscriptionProviderError({
        providerStatus: response.status,
        ...providerDiagnostics(responseBody),
        endpoint,
        method,
        responseBody,
        providerRequestId: providerRequestId(response.headers),
      });
    }
    try {
      return transform(responseBody);
    } catch (cause) {
      if (!(cause instanceof SubscriptionProviderError)) throw cause;
      throw new SubscriptionProviderError({
        providerStatus: response.status,
        providerCode: cause.providerCode ?? "INVALID_RESPONSE",
        providerMessage: cause.providerMessage,
        providerCause: cause.providerCause,
        endpoint,
        method,
        responseBody,
        providerRequestId: providerRequestId(response.headers),
      });
    }
  }

  async createPlan(input: {
    idempotencyKey: string;
    reason: string;
    monthlyPrice: number;
    trialDays: number;
    backUrl: string;
  }) {
    return this.request(
      "/preapproval_plan",
      {
        method: "POST",
        headers: { "X-Idempotency-Key": input.idempotencyKey },
        body: JSON.stringify({
          reason: input.reason,
          auto_recurring: {
            frequency: 1,
            frequency_type: "months",
            transaction_amount: input.monthlyPrice,
            currency_id: "BRL",
            ...freeTrial(input.trialDays),
          },
          back_url: input.backUrl,
        }),
      },
      (raw) =>
        toProviderPlan(raw, getSubscriptionEnv().MERCADO_PAGO_ACCESS_TOKEN),
    );
  }

  async getPlan(id: string) {
    try {
      const plan = await this.request(
        `/preapproval_plan/${encodeURIComponent(id)}`,
        undefined,
        (raw) =>
          toProviderPlan(raw, getSubscriptionEnv().MERCADO_PAGO_ACCESS_TOKEN),
      );
      logMercadoPagoPlanDiagnostic({
        providerPlanIdPresent: Boolean(id.trim()),
        providerPlanIdMasked: maskedProviderId(id),
        lookupStatus: 200,
        planFound: true,
        planStatus: plan.status,
        applicationIdPresent: plan.applicationId !== null,
        collectorIdPresent: plan.collectorId !== null,
      });
      return plan;
    } catch (error) {
      logMercadoPagoPlanDiagnostic({
        providerPlanIdPresent: Boolean(id.trim()),
        providerPlanIdMasked: maskedProviderId(id),
        lookupStatus:
          error instanceof SubscriptionProviderError
            ? error.providerStatus
            : null,
        planFound: false,
        planStatus: null,
        applicationIdPresent: false,
        collectorIdPresent: false,
      });
      throw error;
    }
  }

  async searchPlans() {
    return this.request("/preapproval_plan/search", undefined, (raw) =>
      parse(planSearchSchema, raw).results.map((plan) =>
        toProviderPlan(plan, getSubscriptionEnv().MERCADO_PAGO_ACCESS_TOKEN),
      ),
    );
  }

  async updatePlan(
    id: string,
    input: {
      reason: string;
      monthlyPrice: number;
      trialDays: number;
      backUrl: string;
    },
  ) {
    return this.request(
      `/preapproval_plan/${encodeURIComponent(id)}`,
      {
        method: "PUT",
        body: JSON.stringify({
          reason: input.reason,
          auto_recurring: {
            frequency: 1,
            frequency_type: "months",
            transaction_amount: input.monthlyPrice,
            currency_id: "BRL",
            ...freeTrial(input.trialDays),
          },
          back_url: input.backUrl,
        }),
      },
      (raw) =>
        toProviderPlan(raw, getSubscriptionEnv().MERCADO_PAGO_ACCESS_TOKEN),
    );
  }

  async createAuthorized(input: {
    providerPlanId: string;
    sellerAccountId: string | null;
    cardTokenId: string;
    clientDiagnostics?: MercadoPagoClientDiagnostics;
    externalReference: string;
    payerEmail: string;
    payerEmailMatchesLoggedUser: boolean;
    reason: string;
    backUrl: string;
    notificationUrl: string;
  }) {
    const env = getSubscriptionEnv();
    const runtimePublicKey = env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY;
    const accessToken = env.MERCADO_PAGO_ACCESS_TOKEN;
    const publicKeyClassification = input.clientDiagnostics
      ? {
          prefix:
            input.clientDiagnostics.publicKeyEnvironment === "test"
              ? ("TEST" as const)
              : input.clientDiagnostics.publicKeyEnvironment === "production"
                ? ("APP_USR" as const)
                : ("unknown" as const),
          environment: input.clientDiagnostics.publicKeyEnvironment,
        }
      : credentialClassification(undefined);
    const accessTokenClassification = credentialClassification(accessToken);
    const publicKeyApplicationId = credentialApplicationId(runtimePublicKey);
    const accessTokenApplicationId = credentialApplicationId(accessToken);
    const credentialApplicationIdsMatch =
      publicKeyApplicationId && accessTokenApplicationId
        ? publicKeyApplicationId === accessTokenApplicationId
        : null;
    const sellerAccount = await this.lookupSellerAccount();
    const planCollectorMatchesSeller =
      sellerAccount && input.sellerAccountId
        ? sellerAccount.id === input.sellerAccountId
        : null;
    logMercadoPagoSubscriptionDiagnostic({
      mode: env.MERCADO_PAGO_MODE,
      publicKeyConfigured:
        input.clientDiagnostics?.publicKeyConfigured ?? false,
      accessTokenConfigured: Boolean(accessToken),
      publicKeyPrefix: publicKeyClassification.prefix,
      accessTokenPrefix: accessTokenClassification.prefix,
      publicKeyEnvironment: publicKeyClassification.environment,
      accessTokenEnvironment: accessTokenClassification.environment,
      publicKeyBuildMatchesRuntime: publicKeyBuildMatchesRuntime(
        input.clientDiagnostics,
        runtimePublicKey,
      ),
      publicKeyApplicationIdPresent: Boolean(publicKeyApplicationId),
      accessTokenApplicationIdPresent: Boolean(accessTokenApplicationId),
      credentialApplicationIdsMatch,
      sellerAccountResolved: Boolean(sellerAccount),
      sellerSiteId: sellerAccount?.siteId ?? null,
      sellerTestUser: sellerAccount?.testUser ?? null,
      planCollectorMatchesSeller,
      cardTokenIdPresent: Boolean(input.cardTokenId.trim()),
      preapprovalPlanIdPresent: Boolean(input.providerPlanId.trim()),
    });
    if (credentialApplicationIdsMatch === false) {
      throw new SubscriptionProviderError({
        providerCode: "LOCAL_CREDENTIAL_APPLICATION_MISMATCH",
        providerMessage:
          "Public Key and Access Token identify different applications.",
        endpoint: "/preapproval",
        method: "POST",
      });
    }
    if (planCollectorMatchesSeller === false) {
      throw new SubscriptionProviderError({
        providerCode: "LOCAL_PLAN_COLLECTOR_MISMATCH",
        providerMessage:
          "The subscription plan belongs to a different seller account.",
        endpoint: "/preapproval",
        method: "POST",
      });
    }
    if (sellerAccount?.siteId && sellerAccount.siteId !== "MLB") {
      throw new SubscriptionProviderError({
        providerCode: "LOCAL_SELLER_SITE_MISMATCH",
        providerMessage: "The seller account is not associated with Brazil.",
        endpoint: "/preapproval",
        method: "POST",
      });
    }
    if (env.MERCADO_PAGO_MODE === "production" && sellerAccount?.testUser) {
      throw new SubscriptionProviderError({
        providerCode: "LOCAL_MODE_SELLER_MISMATCH",
        providerMessage:
          "A test seller account cannot be used while production mode is enabled.",
        endpoint: "/preapproval",
        method: "POST",
      });
    }
    const payload = {
      preapproval_plan_id: input.providerPlanId,
      card_token_id: input.cardTokenId,
      reason: input.reason,
      external_reference: input.externalReference,
      payer_email: input.payerEmail,
      back_url: input.backUrl,
      notification_url: input.notificationUrl,
      status: "authorized" as const,
    };
    const normalizedPayerEmail = normalizedEmail(payload.payer_email);
    const payerEmailMatchesSellerAccount = sellerAccount
      ? sellerAccount.email !== null &&
        normalizedPayerEmail === sellerAccount.email
      : null;
    logMercadoPagoPayerDiagnostic({
      mode: env.MERCADO_PAGO_MODE,
      sellerSiteId: sellerAccount?.siteId ?? null,
      sellerSiteMatchesBrazil: sellerAccount?.siteId
        ? sellerAccount.siteId === "MLB"
        : null,
      payerEmailPresent: Boolean(normalizedPayerEmail),
      payerEmailDomain: emailDomain(normalizedPayerEmail),
      payerEmailMatchesLoggedUser: input.payerEmailMatchesLoggedUser,
      payerEmailMatchesSellerAccount,
      payerDifferentFromSeller:
        payerEmailMatchesSellerAccount === null
          ? null
          : !payerEmailMatchesSellerAccount,
      cardTokenIdPresent: Boolean(payload.card_token_id.trim()),
      preapprovalPlanIdPresent: Boolean(payload.preapproval_plan_id.trim()),
      status: payload.status,
    });
    logMercadoPagoPreapprovalPayloadDiagnostic({
      preapprovalPlanIdPresent: Boolean(payload.preapproval_plan_id.trim()),
      cardTokenIdPresent: Boolean(payload.card_token_id.trim()),
      payerEmailPresent: Boolean(payload.payer_email.trim()),
      status: payload.status,
      autoRecurringPresent: Object.hasOwn(payload, "auto_recurring"),
      backUrlPresent: Boolean(payload.back_url.trim()),
    });
    return this.request(
      "/preapproval",
      {
        method: "POST",
        headers: { "X-Idempotency-Key": input.externalReference },
        body: JSON.stringify(payload),
      },
      toProviderSubscription,
    );
  }

  async getSubscription(id: string) {
    return this.request(
      `/preapproval/${encodeURIComponent(id)}`,
      undefined,
      toProviderSubscription,
    );
  }

  async cancelSubscription(id: string) {
    return this.request(
      `/preapproval/${encodeURIComponent(id)}`,
      {
        method: "PUT",
        body: JSON.stringify({ status: "canceled" }),
      },
      toProviderSubscription,
    );
  }

  async reactivateSubscription(id: string) {
    return this.request(
      `/preapproval/${encodeURIComponent(id)}`,
      {
        method: "PUT",
        body: JSON.stringify({ status: "authorized" }),
      },
      toProviderSubscription,
    );
  }

  async getAuthorizedPayment(id: string) {
    const value = await this.request(
      `/authorized_payments/${encodeURIComponent(id)}`,
      undefined,
      (body) => parse(authorizedPaymentSchema, body),
    );
    if (value.payment?.id) {
      const payment = await this.getPayment(String(value.payment.id));
      return {
        ...payment,
        authorizedPaymentId: String(value.id),
        subscriptionId: String(value.preapproval_id),
        externalReference: value.external_reference
          ? String(value.external_reference)
          : payment.externalReference,
      };
    }
    return {
      authorizedPaymentId: String(value.id),
      paymentId: null,
      subscriptionId: String(value.preapproval_id),
      externalReference: value.external_reference
        ? String(value.external_reference)
        : null,
      amount: value.transaction_amount,
      currency: value.currency_id,
      status: value.summarized ?? value.status,
      paidAt: null,
      createdAt: toDate(value.date_created),
    };
  }

  async getPayment(id: string) {
    return this.request(
      `/v1/payments/${encodeURIComponent(id)}`,
      undefined,
      toProviderPayment,
    );
  }
}

export const mercadoPagoSubscriptionProvider =
  new MercadoPagoSubscriptionProvider();
