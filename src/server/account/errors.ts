export class AccountPasswordInvalidError extends Error {
  constructor() {
    super("Senha atual inválida.");
    this.name = "AccountPasswordInvalidError";
  }
}
export class AccountConflictError extends Error {
  constructor(message = "Não foi possível alterar os dados informados.") {
    super(message);
    this.name = "AccountConflictError";
  }
}
export class AccountActiveDeliveryError extends Error {
  constructor() {
    super(
      "Finalize ou cancele adequadamente as entregas pendentes antes de encerrar a conta.",
    );
    this.name = "AccountActiveDeliveryError";
  }
}
export class AccountRateLimitError extends Error {
  constructor(public readonly retryAfterSeconds: number) {
    super("Muitas operações sensíveis em pouco tempo.");
    this.name = "AccountRateLimitError";
  }
}
