import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { Prisma } from "@/generated/prisma/client";
import type {
  MercadoPagoCredentialEnvironment,
  MercadoPagoMode,
} from "@/server/subscriptions/types";

const PRISMA_ERROR_CODE = /^P\d{4}$/;
const MAX_LOG_DEPTH = 6;
const MAX_LOG_ITEMS = 50;
const MAX_LOG_TEXT_LENGTH = 4_000;
const REDACTED = "[REDACTED]";
const SENSITIVE_KEY =
  /database.?url|password|passwd|pwd|secret|token|authorization|cookie|field.?encryption.?key|access.?key|api.?key|webhook|cvv|card|cpf|cnpj|document|(^|_)rg($|_)|phone|email/i;
const DATABASE_URL_IN_TEXT =
  /\b(?:mysql|mariadb|postgres(?:ql)?):\/\/[^\s"'`]+/gi;
const BEARER_TOKEN_IN_TEXT = /\b(Bearer\s+)[A-Za-z0-9._~+/=-]+/gi;
const MERCADO_PAGO_TOKEN_IN_TEXT =
  /\b(?:APP_USR|TEST)-[A-Za-z0-9._~+/=-]{10,}/gi;
const EMAIL_IN_TEXT = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const CARD_NUMBER_IN_TEXT = /\b(?:\d[ -]*?){13,19}\b/g;
const SENSITIVE_ASSIGNMENT_IN_TEXT =
  /((?:DATABASE_URL|FIELD_ENCRYPTION_KEY|MERCADO_PAGO_(?:ACCESS_TOKEN|WEBHOOK_SECRET)|password|passwordHash|secret|card[_-]?token[_-]?id|token|authorization|cookie|cvv|card|cpf|cnpj|document|rg|phone|email)\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^\s,;}\]]+)/gi;

type SafeLogValue =
  | null
  | boolean
  | number
  | string
  | SafeLogValue[]
  | { [key: string]: SafeLogValue };

export type MercadoPagoSubscriptionDiagnostic = {
  mode: MercadoPagoMode;
  publicKeyConfigured: boolean;
  accessTokenConfigured: boolean;
  publicKeyPrefix: "TEST" | "APP_USR" | "unknown" | "not_configured";
  accessTokenPrefix: "TEST" | "APP_USR" | "unknown" | "not_configured";
  publicKeyEnvironment: MercadoPagoCredentialEnvironment;
  accessTokenEnvironment: MercadoPagoCredentialEnvironment;
  publicKeyBuildMatchesRuntime: boolean | null;
  publicKeyApplicationIdPresent: boolean;
  accessTokenApplicationIdPresent: boolean;
  credentialApplicationIdsMatch: boolean | null;
  sellerAccountResolved: boolean;
  sellerSiteId: string | null;
  sellerTestUser: boolean | null;
  planCollectorMatchesSeller: boolean | null;
  cardTokenIdPresent: boolean;
  preapprovalPlanIdPresent: boolean;
};

export function logMercadoPagoSubscriptionDiagnostic(
  diagnostic: MercadoPagoSubscriptionDiagnostic,
) {
  console.info(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "info",
      scope: "api.subscriptions.credential-diagnostic",
      ...diagnostic,
    }),
  );
}

export type MercadoPagoPlanDiagnostic = {
  providerPlanIdPresent: boolean;
  providerPlanIdMasked: string;
  lookupStatus: number | null;
  planFound: boolean;
  planStatus: string | null;
  applicationIdPresent: boolean;
  collectorIdPresent: boolean;
};

export function logMercadoPagoPlanDiagnostic(
  diagnostic: MercadoPagoPlanDiagnostic,
) {
  console.info(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "info",
      scope: "api.subscriptions.plan-diagnostic",
      ...diagnostic,
    }),
  );
}

export type MercadoPagoPreapprovalPayloadDiagnostic = {
  preapprovalPlanIdPresent: boolean;
  cardTokenIdPresent: boolean;
  payerEmailPresent: boolean;
  status: string;
  autoRecurringPresent: boolean;
  backUrlPresent: boolean;
};

export function logMercadoPagoPreapprovalPayloadDiagnostic(
  diagnostic: MercadoPagoPreapprovalPayloadDiagnostic,
) {
  console.info(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "info",
      scope: "api.subscriptions.preapproval-payload-diagnostic",
      ...diagnostic,
    }),
  );
}

export type MercadoPagoPayerDiagnostic = {
  mode: MercadoPagoMode;
  sellerSiteId: string | null;
  sellerSiteMatchesBrazil: boolean | null;
  payerEmailPresent: boolean;
  payerEmailDomain: string | null;
  payerEmailMatchesLoggedUser: boolean;
  payerEmailMatchesSellerAccount: boolean | null;
  payerDifferentFromSeller: boolean | null;
  cardTokenIdPresent: boolean;
  preapprovalPlanIdPresent: boolean;
  status: "authorized";
};

export function logMercadoPagoPayerDiagnostic(
  diagnostic: MercadoPagoPayerDiagnostic,
) {
  console.info(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "info",
      scope: "api.subscriptions.payer-diagnostic",
      ...diagnostic,
      payerEmailDomain: diagnostic.payerEmailDomain
        ? sanitizeText(diagnostic.payerEmailDomain)
        : null,
    }),
  );
}

function sanitizeText(value: string) {
  const sanitized = value
    .replace(DATABASE_URL_IN_TEXT, "[REDACTED_DATABASE_URL]")
    .replace(BEARER_TOKEN_IN_TEXT, `$1${REDACTED}`)
    .replace(MERCADO_PAGO_TOKEN_IN_TEXT, REDACTED)
    .replace(EMAIL_IN_TEXT, REDACTED)
    .replace(CARD_NUMBER_IN_TEXT, REDACTED)
    .replace(SENSITIVE_ASSIGNMENT_IN_TEXT, `$1${REDACTED}`);
  return sanitized.length > MAX_LOG_TEXT_LENGTH
    ? `${sanitized.slice(0, MAX_LOG_TEXT_LENGTH)}...[TRUNCATED]`
    : sanitized;
}

function sanitizeEndpoint(value: unknown) {
  if (typeof value !== "string") return null;
  return sanitizeText(value.split(/[?#]/, 1)[0] || "/");
}

function sanitizeLogValue(
  value: unknown,
  depth = 0,
  seen = new WeakSet<object>(),
): SafeLogValue {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return sanitizeText(value);
  if (typeof value === "number")
    return Number.isFinite(value) ? value : String(value);
  if (typeof value === "boolean") return value;
  if (typeof value === "bigint" || typeof value === "symbol") {
    return String(value);
  }
  if (typeof value === "function")
    return `[Function ${value.name || "anonymous"}]`;
  if (depth >= MAX_LOG_DEPTH) return "[TRUNCATED]";
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== "object") return sanitizeText(String(value));
  if (seen.has(value)) return "[CIRCULAR]";
  seen.add(value);

  if (Array.isArray(value)) {
    const items = value
      .slice(0, MAX_LOG_ITEMS)
      .map((item) => sanitizeLogValue(item, depth + 1, seen));
    if (value.length > MAX_LOG_ITEMS) items.push("[TRUNCATED]");
    return items;
  }

  const result: Record<string, SafeLogValue> = {};
  if (value instanceof Error) {
    result.name = sanitizeText(value.name || "Error");
    result.message = sanitizeText(value.message);
    const errorWithCause = value as Error & { cause?: unknown; code?: unknown };
    if (errorWithCause.code !== undefined) {
      result.code = sanitizeLogValue(errorWithCause.code, depth + 1, seen);
    }
    if (errorWithCause.cause !== undefined) {
      result.cause = sanitizeLogValue(errorWithCause.cause, depth + 1, seen);
    }
  }

  let entries: [string, unknown][];
  try {
    entries = Object.entries(value).slice(0, MAX_LOG_ITEMS);
  } catch {
    return Object.keys(result).length > 0 ? result : "[UNSERIALIZABLE]";
  }
  for (const [key, item] of entries) {
    if (Object.prototype.hasOwnProperty.call(result, key)) continue;
    result[key] = SENSITIVE_KEY.test(key)
      ? REDACTED
      : sanitizeLogValue(item, depth + 1, seen);
  }
  return result;
}

function safeErrorDetails(error: unknown) {
  if (!(error instanceof Error)) return { errorType: "UnknownError" };
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return {
      errorType: error.name || "PrismaClientKnownRequestError",
      errorCode: error.code,
      errorMessage: sanitizeText(error.message),
      errorMeta: sanitizeLogValue(error.meta),
    };
  }
  const candidate = error as Error & {
    code?: unknown;
    providerStatus?: unknown;
    providerCode?: unknown;
    providerMessage?: unknown;
    providerCause?: unknown;
    endpoint?: unknown;
    method?: unknown;
    responseBody?: unknown;
    providerRequestId?: unknown;
  };
  if (error.name === "SubscriptionProviderError") {
    const providerCode =
      typeof candidate.providerCode === "string"
        ? candidate.providerCode.toLowerCase()
        : null;
    return {
      errorType: error.name,
      upstream: true,
      apiStatus: 502,
      providerFailureCategory: providerCode?.startsWith("local_")
        ? "INTEGRATION_CONFIGURATION"
        : providerCode === "guest_site_mismatch"
          ? "PAYER_SITE_MISMATCH"
          : providerCode?.includes("card")
            ? "CARD_OR_TOKEN"
            : "PROVIDER_REJECTED",
      providerStatus:
        typeof candidate.providerStatus === "number"
          ? candidate.providerStatus
          : null,
      providerCode: sanitizeLogValue(candidate.providerCode),
      providerMessage: sanitizeLogValue(candidate.providerMessage),
      cause: sanitizeLogValue(candidate.providerCause),
      endpoint: sanitizeEndpoint(candidate.endpoint),
      method: sanitizeLogValue(candidate.method),
      responseBody: sanitizeLogValue(candidate.responseBody),
      providerRequestId: sanitizeLogValue(candidate.providerRequestId),
    };
  }
  return {
    errorType: error.name || "Error",
    ...(typeof candidate.code === "string" &&
    PRISMA_ERROR_CODE.test(candidate.code)
      ? { errorCode: candidate.code }
      : {}),
  };
}

export function logServerError(scope: string, error: unknown) {
  const correlationId = randomUUID();
  console.error(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "error",
      scope,
      correlationId,
      ...safeErrorDetails(error),
    }),
  );
  return correlationId;
}

export function internalErrorResponse(scope: string, error: unknown) {
  const correlationId = logServerError(scope, error);
  return NextResponse.json(
    {
      error: "Não foi possível concluir esta operação agora.",
      code: "INTERNAL_ERROR",
      correlationId,
    },
    { status: 500, headers: { "Cache-Control": "private, no-store" } },
  );
}
