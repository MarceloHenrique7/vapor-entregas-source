export class CompanyReportProfileRequiredError extends Error {
  constructor() {
    super("Perfil de empresa não encontrado.");
    this.name = "CompanyReportProfileRequiredError";
  }
}

export class CompanyReportLimitError extends Error {
  constructor() {
    super(
      "O relatório excede 10.000 registros. Reduza o período ou os filtros.",
    );
    this.name = "CompanyReportLimitError";
  }
}
