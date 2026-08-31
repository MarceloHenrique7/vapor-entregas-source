export class AdminAccessDeniedError extends Error {
  constructor() {
    super("Acesso administrativo negado.");
    this.name = "AdminAccessDeniedError";
  }
}

export class AdminResourceNotFoundError extends Error {
  constructor(message = "Registro não encontrado.") {
    super(message);
    this.name = "AdminResourceNotFoundError";
  }
}

export class AdminActionConflictError extends Error {
  constructor(
    message = "O registro foi alterado. Atualize a página e tente novamente.",
  ) {
    super(message);
    this.name = "AdminActionConflictError";
  }
}

export class AdminRateLimitError extends Error {
  constructor(public readonly retryAfterSeconds: number) {
    super("Muitas ações administrativas em pouco tempo.");
    this.name = "AdminRateLimitError";
  }
}
