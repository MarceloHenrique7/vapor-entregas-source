export class IntegrationProfileRequiredError extends Error {
  constructor() {
    super("Perfil de empresa não encontrado.");
    this.name = "IntegrationProfileRequiredError";
  }
}
export class IntegrationNotFoundError extends Error {
  constructor() {
    super("Integração não encontrada ou revogada.");
    this.name = "IntegrationNotFoundError";
  }
}
export class IntegrationSignatureError extends Error {
  constructor() {
    super("Assinatura do webhook inválida.");
    this.name = "IntegrationSignatureError";
  }
}
export class ImportedOrderNotFoundError extends Error {
  constructor() {
    super("Pedido importado não encontrado ou indisponível.");
    this.name = "ImportedOrderNotFoundError";
  }
}
export class IntegrationRateLimitError extends Error {
  constructor(public readonly retryAfterSeconds: number) {
    super("Muitas requisições em pouco tempo.");
    this.name = "IntegrationRateLimitError";
  }
}
