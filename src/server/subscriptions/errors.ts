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
export class SubscriptionProviderError extends Error {
  constructor(public readonly providerStatus: number | null = null) {
    super("O Mercado Pago não concluiu esta operação. Tente novamente.");
    this.name = "SubscriptionProviderError";
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
