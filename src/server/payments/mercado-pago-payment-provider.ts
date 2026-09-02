import "server-only";

import { z } from "zod";

import { getSubscriptionEnv } from "@/server/config/env";
import { SubscriptionProviderError } from "@/server/subscriptions/errors";

import type { PaymentProviderClient, ProviderOneOffPayment } from "./types";

const optionalDate = z.string().nullable().optional();
const numberValue = z.union([z.number(), z.string()]).transform(Number);

const paymentSchema = z
  .object({
    id: z.union([z.string(), z.number()]),
    status: z.string(),
    status_detail: z.string().nullable().optional(),
    payment_method_id: z.string().nullable().optional(),
    transaction_amount: numberValue,
    currency_id: z.string().default("BRL"),
    external_reference: z.string().nullable().optional(),
    date_approved: optionalDate,
    date_created: optionalDate,
    date_of_expiration: optionalDate,
    metadata: z
      .object({
        internal_payment_id: z.string().nullable().optional(),
        user_id: z.string().nullable().optional(),
        subscription_plan_id: z.string().nullable().optional(),
        role: z.enum(["MOTOBOY", "COMPANY"]).nullable().optional(),
      })
      .passthrough()
      .optional(),
    point_of_interaction: z
      .object({
        transaction_data: z
          .object({
            qr_code: z.string().nullable().optional(),
            qr_code_base64: z.string().nullable().optional(),
            ticket_url: z.string().url().nullable().optional(),
          })
          .passthrough()
          .nullable()
          .optional(),
      })
      .passthrough()
      .nullable()
      .optional(),
  })
  .passthrough();

type ProviderBody = Record<string, unknown>;

function date(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new SubscriptionProviderError({
      providerCode: "INVALID_PAYMENT_DATE",
    });
  }
  return parsed;
}

function stringField(value: unknown) {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number") return String(value);
  return null;
}

function errorFields(value: unknown) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { providerCode: null, providerMessage: null, providerCause: null };
  }
  const body = value as ProviderBody;
  const cause = Array.isArray(body.cause) ? body.cause : null;
  const firstCause = cause?.find(
    (item) => typeof item === "object" && item !== null,
  ) as ProviderBody | undefined;
  return {
    providerCode:
      stringField(body.code) ??
      stringField(body.error) ??
      stringField(firstCause?.code),
    providerMessage:
      stringField(body.message) ?? stringField(firstCause?.description),
    providerCause: cause,
  };
}

function requestId(headers: Headers) {
  return (
    headers.get("x-request-id") ??
    headers.get("x-correlation-id") ??
    headers.get("x-meli-request-id") ??
    null
  );
}

function toPayment(raw: unknown): ProviderOneOffPayment {
  const parsed = paymentSchema.safeParse(raw);
  if (!parsed.success) {
    throw new SubscriptionProviderError({
      providerCode: "INVALID_PAYMENT_RESPONSE",
    });
  }
  const value = parsed.data;
  const transaction = value.point_of_interaction?.transaction_data;
  const hasPix = Boolean(
    transaction?.qr_code ||
    transaction?.qr_code_base64 ||
    transaction?.ticket_url,
  );
  return {
    id: String(value.id),
    status: value.status,
    statusDetail: value.status_detail?.slice(0, 120) ?? null,
    paymentMethod: value.payment_method_id?.slice(0, 40) ?? null,
    amount: value.transaction_amount,
    currency: value.currency_id,
    externalReference: value.external_reference ?? null,
    internalPaymentId: value.metadata?.internal_payment_id ?? null,
    userId: value.metadata?.user_id ?? null,
    planId: value.metadata?.subscription_plan_id ?? null,
    role: value.metadata?.role ?? null,
    paidAt: date(value.date_approved),
    createdAt: date(value.date_created),
    expiresAt: date(value.date_of_expiration),
    pix: hasPix
      ? {
          qrCode: transaction?.qr_code ?? null,
          qrCodeBase64: transaction?.qr_code_base64 ?? null,
          ticketUrl: transaction?.ticket_url ?? null,
        }
      : null,
  };
}

export class MercadoPagoPaymentProvider implements PaymentProviderClient {
  private async request(
    path: string,
    init: RequestInit | undefined,
  ): Promise<ProviderOneOffPayment> {
    const env = getSubscriptionEnv();
    if (!env.MERCADO_PAGO_ACCESS_TOKEN) {
      throw new SubscriptionProviderError({
        providerCode: "NOT_CONFIGURED",
      });
    }
    const method = init?.method ?? "GET";
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
        endpoint: path,
        method,
      });
    }
    const text = await response.text();
    let body: unknown;
    try {
      body = text ? JSON.parse(text) : null;
    } catch (cause) {
      throw new SubscriptionProviderError({
        providerStatus: response.status,
        providerCode: "INVALID_RESPONSE",
        providerCause: cause,
        endpoint: path,
        method,
        responseBody: text || null,
        providerRequestId: requestId(response.headers),
      });
    }
    if (!response.ok) {
      throw new SubscriptionProviderError({
        providerStatus: response.status,
        ...errorFields(body),
        endpoint: path,
        method,
        responseBody: body,
        providerRequestId: requestId(response.headers),
      });
    }
    try {
      return toPayment(body);
    } catch (cause) {
      if (!(cause instanceof SubscriptionProviderError)) throw cause;
      throw new SubscriptionProviderError({
        providerStatus: response.status,
        providerCode: cause.providerCode,
        providerMessage: cause.providerMessage,
        providerCause: cause.providerCause,
        endpoint: path,
        method,
        responseBody: body,
        providerRequestId: requestId(response.headers),
      });
    }
  }

  createPayment(input: Parameters<PaymentProviderClient["createPayment"]>[0]) {
    const cardFields = input.token
      ? {
          token: input.token,
          installments: input.installments ?? 1,
          ...(input.issuerId ? { issuer_id: input.issuerId } : {}),
        }
      : {};
    return this.request("/v1/payments", {
      method: "POST",
      headers: { "X-Idempotency-Key": input.idempotencyKey },
      body: JSON.stringify({
        transaction_amount: input.amount,
        description: input.description,
        payment_method_id: input.paymentMethodId,
        ...cardFields,
        payer: {
          email: input.payerEmail,
          ...(input.identification
            ? { identification: input.identification }
            : {}),
        },
        external_reference: input.externalReference,
        metadata: {
          internal_payment_id: input.internalPaymentId,
          user_id: input.userId,
          subscription_plan_id: input.planId,
          role: input.role,
        },
        notification_url: input.notificationUrl,
      }),
    });
  }

  getPayment(id: string) {
    return this.request(`/v1/payments/${encodeURIComponent(id)}`, undefined);
  }
}

export const mercadoPagoPaymentProvider = new MercadoPagoPaymentProvider();
