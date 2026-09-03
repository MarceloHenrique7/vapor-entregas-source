export class LocationNotFoundError extends Error {
  constructor(message = "Localização não encontrada.") {
    super(message);
    this.name = "LocationNotFoundError";
  }
}

export class LocationRateLimitError extends Error {
  constructor(public readonly retryAfterSeconds: number) {
    super(
      "Muitas buscas de endereço em pouco tempo. Aguarde e tente novamente.",
    );
    this.name = "LocationRateLimitError";
  }
}
