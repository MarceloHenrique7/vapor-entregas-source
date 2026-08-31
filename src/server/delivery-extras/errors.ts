export class DeliveryExtraNotFoundError extends Error {
  constructor() {
    super("Adicional não encontrado.");
    this.name = "DeliveryExtraNotFoundError";
  }
}

export class DeliveryExtraAccessDeniedError extends Error {
  constructor() {
    super("Você não pode alterar este adicional.");
    this.name = "DeliveryExtraAccessDeniedError";
  }
}

export class DeliveryExtraConflictError extends Error {
  constructor(
    message = "Este adicional já foi respondido ou a entrega não permite a operação.",
  ) {
    super(message);
    this.name = "DeliveryExtraConflictError";
  }
}
