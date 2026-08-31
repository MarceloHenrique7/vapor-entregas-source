export class ReputationAccessDeniedError extends Error {
  constructor() {
    super("Você não tem acesso a esta operação.");
    this.name = "ReputationAccessDeniedError";
  }
}

export class DeliveryNotEligibleError extends Error {
  constructor(message = "Esta entrega ainda não pode ser avaliada.") {
    super(message);
    this.name = "DeliveryNotEligibleError";
  }
}

export class DuplicateRatingError extends Error {
  constructor() {
    super("Você já avaliou a outra parte nesta entrega.");
    this.name = "DuplicateRatingError";
  }
}

export class DuplicateFavoriteError extends Error {
  constructor() {
    super("Este motoboy já está nos favoritos.");
    this.name = "DuplicateFavoriteError";
  }
}

export class FavoriteNotFoundError extends Error {
  constructor() {
    super("Favorito não encontrado.");
    this.name = "FavoriteNotFoundError";
  }
}

export class DuplicateReportError extends Error {
  constructor() {
    super("Uma denúncia idêntica já foi registrada.");
    this.name = "DuplicateReportError";
  }
}

export class ReportRateLimitError extends Error {
  constructor(public readonly retryAfterSeconds: number) {
    super(
      "Muitas denúncias em pouco tempo. Aguarde antes de tentar novamente.",
    );
    this.name = "ReportRateLimitError";
  }
}
