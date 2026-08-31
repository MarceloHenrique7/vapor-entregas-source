import "server-only";

import { z } from "zod";

import { getSubscriptionEnv } from "@/server/config/env";

import {
  SubscriptionProviderError,
  SubscriptionProviderNotConfiguredError,
} from "./errors";
import type {
  ProviderPayment,
  ProviderPlan,
  ProviderSubscription,
  SubscriptionProviderClient,
} from "./types";

const numberValue = z.union([z.number(), z.string()]).transform(Number);
const optionalDate = z.string().nullable().optional();

const planSchema = z
  .object({
    id: z.union([z.string(), z.number()]),
    reason: z.string(),
    status: z.string().nullable().optional(),
    back_url: z.string().nullable().optional(),
    auto_recurring: z.object({
      frequency: numberValue,
      frequency_type: z.string(),
      transaction_amount: numberValue,
      currency_id: z.string(),
    }),
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

function toProviderPlan(raw: unknown): ProviderPlan {
  const value = parse(planSchema, raw);
  return {
    id: String(value.id),
    reason: value.reason,
    amount: value.auto_recurring.transaction_amount,
    currency: value.auto_recurring.currency_id,
    frequency: value.auto_recurring.frequency,
    frequencyType: value.auto_recurring.frequency_type,
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
  private async request(path: string, init?: RequestInit) {
    const env = getSubscriptionEnv();
    if (!env.MERCADO_PAGO_ACCESS_TOKEN) {
      throw new SubscriptionProviderNotConfiguredError();
    }
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
    } catch {
      throw new SubscriptionProviderError();
    }
    if (!response.ok) throw new SubscriptionProviderError(response.status);
    try {
      return (await response.json()) as unknown;
    } catch {
      throw new SubscriptionProviderError(response.status);
    }
  }

  async createPlan(input: {
    idempotencyKey: string;
    reason: string;
    monthlyPrice: number;
    backUrl: string;
  }) {
    return toProviderPlan(
      await this.request("/preapproval_plan", {
        method: "POST",
        headers: { "X-Idempotency-Key": input.idempotencyKey },
        body: JSON.stringify({
          reason: input.reason,
          auto_recurring: {
            frequency: 1,
            frequency_type: "months",
            transaction_amount: input.monthlyPrice,
            currency_id: "BRL",
          },
          back_url: input.backUrl,
        }),
      }),
    );
  }

  async getPlan(id: string) {
    return toProviderPlan(
      await this.request(`/preapproval_plan/${encodeURIComponent(id)}`),
    );
  }

  async updatePlan(
    id: string,
    input: { reason: string; monthlyPrice: number; backUrl: string },
  ) {
    return toProviderPlan(
      await this.request(`/preapproval_plan/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify({
          reason: input.reason,
          auto_recurring: {
            frequency: 1,
            frequency_type: "months",
            transaction_amount: input.monthlyPrice,
            currency_id: "BRL",
          },
          back_url: input.backUrl,
        }),
      }),
    );
  }

  async createPending(input: {
    providerPlanId: string;
    externalReference: string;
    payerEmail: string;
    reason: string;
    backUrl: string;
    notificationUrl: string;
  }) {
    return toProviderSubscription(
      await this.request("/preapproval", {
        method: "POST",
        headers: { "X-Idempotency-Key": input.externalReference },
        body: JSON.stringify({
          preapproval_plan_id: input.providerPlanId,
          reason: input.reason,
          external_reference: input.externalReference,
          payer_email: input.payerEmail,
          back_url: input.backUrl,
          notification_url: input.notificationUrl,
          status: "pending",
        }),
      }),
    );
  }

  async getSubscription(id: string) {
    return toProviderSubscription(
      await this.request(`/preapproval/${encodeURIComponent(id)}`),
    );
  }

  async cancelSubscription(id: string) {
    return toProviderSubscription(
      await this.request(`/preapproval/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify({ status: "canceled" }),
      }),
    );
  }

  async reactivateSubscription(id: string) {
    return toProviderSubscription(
      await this.request(`/preapproval/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify({ status: "authorized" }),
      }),
    );
  }

  async getAuthorizedPayment(id: string) {
    const value = parse(
      authorizedPaymentSchema,
      await this.request(`/authorized_payments/${encodeURIComponent(id)}`),
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
    return toProviderPayment(
      await this.request(`/v1/payments/${encodeURIComponent(id)}`),
    );
  }
}

export const mercadoPagoSubscriptionProvider =
  new MercadoPagoSubscriptionProvider();
