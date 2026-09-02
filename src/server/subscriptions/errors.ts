export class SubscriptionRequiredError extends Error {
  constructor() {
    super("Uma assinatura ativa é necessária para esta operação.");
    this.name = "SubscriptionRequiredError";
  }
}
export class SubscriptionConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SubscriptionConflictError";
  }
}
export class SubscriptionNotFoundError extends Error {
  constructor() {
    super("Assinatura não encontrada.");
    this.name = "SubscriptionNotFoundError";
  }
}
export class SubscriptionProviderNotConfiguredError extends Error {
  constructor() {
    super(
      "A integração de assinaturas ainda não foi configurada neste ambiente.",
    );
    this.name = "SubscriptionProviderNotConfiguredError";
  }
}

export type SubscriptionProviderErrorDetails = {
  providerStatus?: number | null;
  providerCode?: string | null;
  providerMessage?: string | null;
  providerCause?: unknown;
  endpoint?: string | null;
  method?: string | null;
  responseBody?: unknown;
  providerRequestId?: string | null;
};

export class SubscriptionProviderError extends Error {
  public readonly providerStatus: number | null;
  public readonly providerCode: string | null;
  public readonly providerMessage: string | null;
  public readonly providerCause: unknown;
  public readonly endpoint: string | null;
  public readonly method: string | null;
  public readonly responseBody: unknown;
  public readonly providerRequestId: string | null;

  constructor(
    details: number | null | SubscriptionProviderErrorDetails = null,
  ) {
    super("O Mercado Pago não concluiu esta operação. Tente novamente.");
    this.name = "SubscriptionProviderError";
    const values =
      typeof details === "number" || details === null
        ? { providerStatus: details }
        : details;
    this.providerStatus = values.providerStatus ?? null;
    this.providerCode = values.providerCode ?? null;
    this.providerMessage = values.providerMessage ?? null;
    this.providerCause = values.providerCause ?? null;
    this.endpoint = values.endpoint ?? null;
    this.method = values.method ?? null;
    this.responseBody = values.responseBody ?? null;
    this.providerRequestId = values.providerRequestId ?? null;
  }
}
export class InvalidWebhookSignatureError extends Error {
  constructor() {
    super("Assinatura do webhook inválida.");
    this.name = "InvalidWebhookSignatureError";
  }
}
export class SubscriptionRateLimitError extends Error {
  constructor(public readonly retryAfterSeconds: number) {
    super("Muitas tentativas. Aguarde antes de tentar novamente.");
    this.name = "SubscriptionRateLimitError";
  }
}
