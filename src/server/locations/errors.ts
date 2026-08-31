export class LocationNotFoundError extends Error {
  constructor(message = "Localização não encontrada.") {
    super(message);
    this.name = "LocationNotFoundError";
  }
}
