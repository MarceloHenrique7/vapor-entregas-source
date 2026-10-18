import { describe, expect, it, vi } from "vitest";
import { strFromU8, unzipSync } from "fflate";

import { createCompanyReportPdf } from "./pdf";
import type { CompanyReportData } from "./types";
import { createCompanyReportXlsx, safeSpreadsheetText } from "./xlsx";

vi.mock("server-only", () => ({}));

const report: CompanyReportData = {
  companyName: "Empresa Teste",
  generatedAt: "2026-10-17T12:00:00.000Z",
  period: { from: "2026-10-01T03:00:00.000Z", to: "2026-11-01T03:00:00.000Z" },
  filters: { status: null, motoboyId: null, channel: null },
  summary: {
    totalDeliveries: 1,
    completedDeliveries: 1,
    cancelledDeliveries: 0,
    totalRecordedCents: 2250,
    averageRecordedCents: 2250,
    confirmedPaymentCents: 2250,
    pendingOrUnconfirmedCents: 0,
  },
  rows: [
    {
      id: "24ccf135-afee-4231-80f9-51483afff7ef",
      createdAt: "2026-10-17T11:00:00.000Z",
      origin: "Rua A, 1 · Centro",
      destination: "Rua B, 2",
      destinationNeighborhood: "Areia Branca",
      motoboy: "João",
      distanceKm: 5.5,
      baseValueCents: 2000,
      acknowledgedExtrasCents: 250,
      finalRecordedValueCents: 2250,
      status: "COMPLETED",
      paymentStatus: "CONFIRMED",
      paymentMethod: "Pix direto pela empresa",
      channel: "Vapor Entregas",
      notes: '=HYPERLINK("https://example.test")',
    },
  ],
  notice: "Valores informativos.",
};

describe("exports de relatórios da empresa", () => {
  it("gera PDF válido", async () => {
    const content = await createCompanyReportPdf(report);
    expect(content.subarray(0, 5).toString()).toBe("%PDF-");
    expect(content.length).toBeGreaterThan(1_000);
  });

  it("gera XLSX válido com duas abas e valores numéricos", () => {
    const content = createCompanyReportXlsx(report);
    expect(content.subarray(0, 2).toString()).toBe("PK");
    const files = unzipSync(content);
    const workbook = strFromU8(files["xl/workbook.xml"]);
    const deliveries = strFromU8(files["xl/worksheets/sheet1.xml"]);
    expect(workbook).toContain('name="Entregas"');
    expect(workbook).toContain('name="Resumo"');
    expect(deliveries).toContain("22.5");
    expect(deliveries).toContain("&apos;=HYPERLINK");
  });

  it("neutraliza fórmulas vindas de texto não confiável", () => {
    expect(safeSpreadsheetText("=1+1")).toBe("'=1+1");
    expect(safeSpreadsheetText("@SUM(A1)")).toBe("'@SUM(A1)");
  });
});
