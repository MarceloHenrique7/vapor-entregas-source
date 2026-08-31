export class GeocodingUnavailableError extends Error {
  constructor(
    message = "O serviço de localização está indisponível no momento.",
  ) {
    super(message);
    this.name = "GeocodingUnavailableError";
  }
}
