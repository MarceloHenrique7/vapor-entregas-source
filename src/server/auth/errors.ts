export class InvalidCredentialsError extends Error {
  constructor() {
    super("Credenciais inválidas.");
    this.name = "InvalidCredentialsError";
  }
}

export class UnauthenticatedError extends Error {
  constructor() {
    super("Autenticação necessária.");
    this.name = "UnauthenticatedError";
  }
}

export class ForbiddenError extends Error {
  constructor() {
    super("Acesso não autorizado para esta função.");
    this.name = "ForbiddenError";
  }
}
