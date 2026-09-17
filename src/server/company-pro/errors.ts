export class CompanyProProfileRequiredError extends Error {
  constructor() {
    super("Perfil de empresa não encontrado.");
    this.name = "CompanyProProfileRequiredError";
  }
}

export class CompanyProRequiredError extends Error {
  constructor() {
    super("Este recurso está disponível para empresas com Vapor Gestão Pro.");
    this.name = "CompanyProRequiredError";
  }
}

export class CompanyProExportLimitError extends Error {
  constructor() {
    super(
      "O período possui muitos registros. Reduza o intervalo da exportação.",
    );
    this.name = "CompanyProExportLimitError";
  }
}
