export class MotoboyProfileNotFoundError extends Error {
  constructor() {
    super("Perfil de motoboy não encontrado.");
    this.name = "MotoboyProfileNotFoundError";
  }
}

export class MotoboyOfflineError extends Error {
  constructor() {
    super("Fique online antes de atualizar a localização.");
    this.name = "MotoboyOfflineError";
  }
}

export class PresenceRateLimitError extends Error {
  constructor(public readonly retryAfterSeconds: number) {
    super("A localização foi atualizada recentemente.");
    this.name = "PresenceRateLimitError";
  }
}
