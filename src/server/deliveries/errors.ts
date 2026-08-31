export class CompanyProfileRequiredError extends Error {
  constructor() {
    super("Perfil de empresa não encontrado.");
    this.name = "CompanyProfileRequiredError";
  }
}

export class DefaultPickupRequiredError extends Error {
  constructor() {
    super("Cadastre e confirme o ponto padrão de coleta antes de publicar.");
    this.name = "DefaultPickupRequiredError";
  }
}

export class MotoboyPresenceRequiredError extends Error {
  constructor() {
    super("Fique online com localização recente para acessar oportunidades.");
    this.name = "MotoboyPresenceRequiredError";
  }
}

export class DeliveryUnavailableError extends Error {
  constructor() {
    super("Esta oportunidade já foi aceita ou não está mais disponível.");
    this.name = "DeliveryUnavailableError";
  }
}

export class DeliveryExtrasAcknowledgementRequiredError extends Error {
  constructor() {
    super("Leia e confirme as condições especiais antes de aceitar.");
    this.name = "DeliveryExtrasAcknowledgementRequiredError";
  }
}

export class DeliveryRateLimitError extends Error {
  constructor(public readonly retryAfterSeconds: number) {
    super("Muitas ações em pouco tempo. Aguarde e tente novamente.");
    this.name = "DeliveryRateLimitError";
  }
}

export class DeliveryNotFoundError extends Error {
  constructor() {
    super("Entrega não encontrada.");
    this.name = "DeliveryNotFoundError";
  }
}

export class DeliveryAccessDeniedError extends Error {
  constructor() {
    super("Você não tem acesso a esta entrega.");
    this.name = "DeliveryAccessDeniedError";
  }
}

export class InvalidDeliveryTransitionError extends Error {
  constructor(message = "Esta mudança de status não é permitida.") {
    super(message);
    this.name = "InvalidDeliveryTransitionError";
  }
}

export class DeliveryTransitionConflictError extends Error {
  constructor() {
    super(
      "O status da entrega já foi alterado. Atualize a tela e tente novamente.",
    );
    this.name = "DeliveryTransitionConflictError";
  }
}
