export class RegistrationConflictError extends Error {
  constructor() {
    super("Já existe um cadastro com um dos dados informados.");
    this.name = "RegistrationConflictError";
  }
}

export class RegistrationRateLimitError extends Error {
  constructor(public readonly retryAfterSeconds: number) {
    super("Muitas tentativas de cadastro. Aguarde antes de tentar novamente.");
    this.name = "RegistrationRateLimitError";
  }
}
