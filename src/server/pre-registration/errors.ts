export class PreRegistrationPayloadTooLargeError extends Error {
  constructor() {
    super("Os dados enviados excedem o limite permitido.");
    this.name = "PreRegistrationPayloadTooLargeError";
  }
}

export class PreRegistrationRateLimitError extends Error {
  constructor(public readonly retryAfterSeconds: number) {
    super("Muitas tentativas. Aguarde antes de tentar novamente.");
    this.name = "PreRegistrationRateLimitError";
  }
}
