export class RegistrationConflictError extends Error {
  constructor() {
    super("Já existe um cadastro com um dos dados informados.");
    this.name = "RegistrationConflictError";
  }
}
