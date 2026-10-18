import "server-only";

import { strToU8, zipSync } from "fflate";

import {
  DELIVERY_STATUS_LABELS,
  DELIVERY_PAYMENT_STATUS_LABELS,
} from "@/config/delivery";

import type { CompanyReportData } from "./types";

const xml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

export function safeSpreadsheetText(value: unknown) {
  const text = String(value ?? "").replace(
    /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,
    " ",
  );
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function columnName(index: number) {
  let result = "";
  let current = index + 1;
  while (current > 0) {
    current -= 1;
    result = String.fromCharCode(65 + (current % 26)) + result;
    current = Math.floor(current / 26);
  }
  return result;
}

function inlineCell(row: number, column: number, value: unknown, style = 0) {
  return `<c r="${columnName(column)}${row}" t="inlineStr" s="${style}"><is><t xml:space="preserve">${xml(safeSpreadsheetText(value))}</t></is></c>`;
}

function numberCell(row: number, column: number, value: number, style = 0) {
  return `<c r="${columnName(column)}${row}" s="${style}"><v>${Number.isFinite(value) ? value : 0}</v></c>`;
}

function excelDate(value: string) {
  return new Date(value).getTime() / 86_400_000 + 25569;
}

function buildDeliveriesSheet(report: CompanyReportData) {
  const headers = [
    "Data e hora",
    "ID da entrega",
    "Origem",
    "Destino",
    "Bairro",
    "Motoboy",
    "Distância (km)",
    "Valor base",
    "Adicionais confirmados",
    "Valor final registrado",
    "Status",
    "Status do pagamento",
    "Forma de pagamento",
    "Canal",
    "Observação",
  ];
  const rows = [
    `<row r="1" ht="24">${headers.map((header, index) => inlineCell(1, index, header, 1)).join("")}</row>`,
    ...report.rows.map((item, index) => {
      const row = index + 2;
      const status =
        DELIVERY_STATUS_LABELS[
          item.status as keyof typeof DELIVERY_STATUS_LABELS
        ] ?? item.status;
      const paymentStatus =
        DELIVERY_PAYMENT_STATUS_LABELS[
          item.paymentStatus as keyof typeof DELIVERY_PAYMENT_STATUS_LABELS
        ] ?? item.paymentStatus;
      return `<row r="${row}">${[
        numberCell(row, 0, excelDate(item.createdAt), 3),
        inlineCell(row, 1, item.id),
        inlineCell(row, 2, item.origin),
        inlineCell(row, 3, item.destination),
        inlineCell(row, 4, item.destinationNeighborhood),
        inlineCell(row, 5, item.motoboy),
        numberCell(row, 6, item.distanceKm, 4),
        numberCell(row, 7, item.baseValueCents / 100, 2),
        numberCell(row, 8, item.acknowledgedExtrasCents / 100, 2),
        numberCell(row, 9, item.finalRecordedValueCents / 100, 2),
        inlineCell(row, 10, status),
        inlineCell(row, 11, paymentStatus),
        inlineCell(row, 12, item.paymentMethod),
        inlineCell(row, 13, item.channel),
        inlineCell(row, 14, item.notes),
      ].join("")}</row>`;
    }),
  ];
  const lastRow = Math.max(1, report.rows.length + 1);
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <cols><col min="1" max="1" width="20" customWidth="1"/><col min="2" max="2" width="38" customWidth="1"/><col min="3" max="6" width="28" customWidth="1"/><col min="7" max="10" width="20" customWidth="1"/><col min="11" max="15" width="24" customWidth="1"/></cols>
  <sheetData>${rows.join("")}</sheetData>
  <autoFilter ref="A1:O${lastRow}"/>
</worksheet>`;
}

function buildSummarySheet(report: CompanyReportData) {
  const entries: Array<[string, string | number, number?]> = [
    ["Empresa", report.companyName],
    ["Gerado em", report.generatedAt, 3],
    ["Total de corridas", report.summary.totalDeliveries],
    ["Concluídas", report.summary.completedDeliveries],
    ["Canceladas", report.summary.cancelledDeliveries],
    ["Valor total registrado", report.summary.totalRecordedCents / 100, 2],
    [
      "Média por corrida concluída",
      report.summary.averageRecordedCents / 100,
      2,
    ],
    ["Pagamento confirmado", report.summary.confirmedPaymentCents / 100, 2],
    [
      "Pendente ou não confirmado",
      report.summary.pendingOrUnconfirmedCents / 100,
      2,
    ],
    ["Aviso", report.notice],
  ];
  const rows = entries.map(([label, value, style], index) => {
    const row = index + 1;
    const second =
      typeof value === "number"
        ? numberCell(
            row,
            1,
            style === 3 ? excelDate(String(value)) : value,
            style ?? 0,
          )
        : style === 3
          ? numberCell(row, 1, excelDate(value), 3)
          : inlineCell(row, 1, value);
    return `<row r="${row}">${inlineCell(row, 0, label, 1)}${second}</row>`;
  });
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <cols><col min="1" max="1" width="32" customWidth="1"/><col min="2" max="2" width="72" customWidth="1"/></cols>
  <sheetData>${rows.join("")}</sheetData>
</worksheet>`;
}

export function createCompanyReportXlsx(report: CompanyReportData) {
  const files: Record<string, Uint8Array> = {
    "[Content_Types].xml": strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
    ),
    "_rels/.rels": strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    ),
    "xl/workbook.xml": strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Entregas" sheetId="1" r:id="rId1"/><sheet name="Resumo" sheetId="2" r:id="rId2"/></sheets></workbook>`,
    ),
    "xl/_rels/workbook.xml.rels": strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    ),
    "xl/styles.xml": strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="2"><numFmt numFmtId="164" formatCode='&quot;R$&quot; #,##0.00'/><numFmt numFmtId="165" formatCode="0.00"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Arial"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Arial"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEA1D2C"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="5"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="1" borderId="0" xfId="0" applyFill="1" applyFont="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="22" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs></styleSheet>`,
    ),
    "xl/worksheets/sheet1.xml": strToU8(buildDeliveriesSheet(report)),
    "xl/worksheets/sheet2.xml": strToU8(buildSummarySheet(report)),
  };
  return Buffer.from(zipSync(files, { level: 6 }));
}
