type DiagnosticStage =
  "payment-methods" | "issuer" | "card-token" | "card-form";

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function firstErrorRecord(error: unknown) {
  if (Array.isArray(error)) return asRecord(error[0]);
  return asRecord(error);
}

function safeText(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const text = String(value)
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[REDACTED]")
    .replace(/\b(?:APP_USR|TEST)-[A-Za-z0-9._~+/=-]{10,}/gi, "[REDACTED]")
    .replace(/\b(?:\d[ -]*?){11,19}\b/g, "[REDACTED]")
    .replace(/(card[_-]?token[_-]?id\s*[:=]\s*)([^\s,;}"]+)/gi, "$1[REDACTED]");
  return text.slice(0, 500);
}

export function mercadoPagoSdkErrorDiagnostic(
  stage: DiagnosticStage,
  error: unknown,
) {
  const value = firstErrorRecord(error);
  const cause = asRecord(value?.cause);
  return {
    stage,
    sdkErrorCode: safeText(value?.code ?? cause?.code),
    sdkErrorStatus:
      typeof value?.status === "number" || typeof value?.status === "string"
        ? value.status
        : null,
    sdkErrorMessage: safeText(value?.message ?? cause?.message),
  };
}

export function mercadoPagoCardResolutionDiagnostic(data: {
  paymentMethodId?: string | null;
  issuerId?: string | null;
  token?: string | null;
}) {
  return {
    paymentMethodResolved: Boolean(data.paymentMethodId?.trim()),
    issuerResolved: Boolean(data.issuerId?.trim()),
    tokenGenerated: Boolean(data.token?.trim()),
  };
}

export function mercadoPagoDiagnosticStage(
  error: unknown,
  fallback: DiagnosticStage = "card-form",
): DiagnosticStage {
  const value = firstErrorRecord(error);
  const message = safeText(value?.message)?.toLowerCase() ?? "";
  if (message.includes("payment method")) return "payment-methods";
  if (message.includes("issuer")) return "issuer";
  if (message.includes("token")) return "card-token";
  return fallback;
}
