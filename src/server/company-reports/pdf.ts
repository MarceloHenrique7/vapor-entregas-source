import "server-only";

import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFPage,
  type PDFFont,
} from "pdf-lib";

import { DELIVERY_STATUS_LABELS } from "@/config/delivery";

import type { CompanyReportData } from "./types";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const dateTime = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Bahia",
  dateStyle: "short",
  timeStyle: "short",
});

function clean(value: string) {
  return value.replace(/[\r\n]+/g, " ").replace(/[^\x20-\xFF]/g, "?");
}

function truncate(value: string, maximum: number) {
  const safe = clean(value);
  return safe.length > maximum ? `${safe.slice(0, maximum - 1)}…` : safe;
}

function drawHeader(
  page: PDFPage,
  bold: PDFFont,
  regular: PDFFont,
  report: CompanyReportData,
) {
  page.drawRectangle({
    x: 0,
    y: 770,
    width: 842,
    height: 65,
    color: rgb(0.92, 0.11, 0.17),
  });
  page.drawText("VAPOR ENTREGAS", {
    x: 34,
    y: 802,
    size: 16,
    font: bold,
    color: rgb(1, 1, 1),
  });
  page.drawText("Relatório de entregas e valores registrados", {
    x: 34,
    y: 783,
    size: 10,
    font: regular,
    color: rgb(1, 1, 1),
  });
  page.drawText(clean(report.companyName), {
    x: 590,
    y: 795,
    size: 10,
    font: bold,
    color: rgb(1, 1, 1),
  });
}

export async function createCompanyReportPdf(report: CompanyReportData) {
  const document = await PDFDocument.create();
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  let page = document.addPage([842, 595]);
  drawHeader(page, bold, regular, report);

  const summary = [
    ["Corridas", String(report.summary.totalDeliveries)],
    ["Concluídas", String(report.summary.completedDeliveries)],
    ["Canceladas", String(report.summary.cancelledDeliveries)],
    ["Valor registrado", money.format(report.summary.totalRecordedCents / 100)],
    [
      "Pagamento confirmado",
      money.format(report.summary.confirmedPaymentCents / 100),
    ],
  ];
  summary.forEach(([label, value], index) => {
    const x = 34 + index * 155;
    page.drawRectangle({
      x,
      y: 715,
      width: 143,
      height: 42,
      color: rgb(0.97, 0.97, 0.98),
    });
    page.drawText(label, {
      x: x + 8,
      y: 741,
      size: 8,
      font: regular,
      color: rgb(0.35, 0.35, 0.38),
    });
    page.drawText(value, {
      x: x + 8,
      y: 724,
      size: 11,
      font: bold,
      color: rgb(0.08, 0.08, 0.1),
    });
  });
  page.drawText(`Gerado em ${dateTime.format(new Date(report.generatedAt))}`, {
    x: 34,
    y: 690,
    size: 8,
    font: regular,
    color: rgb(0.35, 0.35, 0.38),
  });
  page.drawText(truncate(report.notice, 145), {
    x: 34,
    y: 675,
    size: 8,
    font: regular,
    color: rgb(0.35, 0.35, 0.38),
  });

  const headers = [
    "Data",
    "ID",
    "Destino",
    "Motoboy",
    "Km",
    "Valor",
    "Status",
    "Canal",
  ];
  const widths = [68, 82, 170, 115, 42, 78, 112, 98];
  let y = 648;
  const drawTableHeader = () => {
    let x = 34;
    page.drawRectangle({
      x: 34,
      y: y - 4,
      width: 765,
      height: 20,
      color: rgb(0.12, 0.12, 0.14),
    });
    headers.forEach((header, index) => {
      page.drawText(header, {
        x: x + 4,
        y: y + 2,
        size: 7.5,
        font: bold,
        color: rgb(1, 1, 1),
      });
      x += widths[index];
    });
    y -= 19;
  };
  drawTableHeader();
  for (const row of report.rows) {
    if (y < 38) {
      page = document.addPage([842, 595]);
      drawHeader(page, bold, regular, report);
      y = 748;
      drawTableHeader();
    }
    let x = 34;
    const values = [
      dateTime.format(new Date(row.createdAt)),
      row.id.slice(0, 8),
      `${row.destination} · ${row.destinationNeighborhood}`,
      row.motoboy,
      row.distanceKm.toLocaleString("pt-BR", { maximumFractionDigits: 2 }),
      money.format(row.finalRecordedValueCents / 100),
      DELIVERY_STATUS_LABELS[
        row.status as keyof typeof DELIVERY_STATUS_LABELS
      ] ?? row.status,
      row.channel,
    ];
    page.drawRectangle({
      x: 34,
      y: y - 5,
      width: 765,
      height: 19,
      color: rgb(0.985, 0.985, 0.99),
    });
    values.forEach((value, index) => {
      const max = Math.max(5, Math.floor(widths[index] / 5));
      page.drawText(truncate(value, max), {
        x: x + 4,
        y,
        size: 7,
        font: regular,
        color: rgb(0.12, 0.12, 0.14),
      });
      x += widths[index];
    });
    y -= 20;
  }
  if (!report.rows.length) {
    page.drawText("Nenhuma entrega encontrada para os filtros selecionados.", {
      x: 34,
      y: 620,
      size: 10,
      font: regular,
    });
  }
  const pages = document.getPages();
  pages.forEach((item, index) => {
    item.drawText(`Página ${index + 1} de ${pages.length}`, {
      x: 742,
      y: 18,
      size: 7,
      font: regular,
      color: rgb(0.4, 0.4, 0.42),
    });
  });
  return Buffer.from(await document.save());
}
