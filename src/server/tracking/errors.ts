export class TrackingNotFoundError extends Error {
  constructor() {
    super("Rastreamento não encontrado.");
    this.name = "TrackingNotFoundError";
  }
}

export class TrackingExpiredError extends Error {
  constructor() {
    super("Este link de rastreamento expirou.");
    this.name = "TrackingExpiredError";
  }
}

export class TrackingAccessDeniedError extends Error {
  constructor() {
    super("Você não tem acesso ao rastreamento desta entrega.");
    this.name = "TrackingAccessDeniedError";
  }
}

export class TrackingUnavailableError extends Error {
  constructor(message = "O rastreamento não está disponível nesta etapa.") {
    super(message);
    this.name = "TrackingUnavailableError";
  }
}

export class TrackingRateLimitError extends Error {
  constructor(public readonly retryAfterSeconds: number) {
    super("Muitas atualizações em pouco tempo. Aguarde e tente novamente.");
    this.name = "TrackingRateLimitError";
  }
}
