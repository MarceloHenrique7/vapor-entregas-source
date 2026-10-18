import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireRole } from "@/server/auth/guards";
import { createCompanyReportPdf } from "@/server/company-reports/pdf";
import { getCompanyReportData } from "@/server/company-reports/report-service";
import { companyReportErrorResponse } from "@/server/company-reports/route-response";
import { createCompanyReportXlsx } from "@/server/company-reports/xlsx";

export const dynamic = "force-dynamic";

const formatSchema = z.enum(["pdf", "xlsx"]);

export async function GET(request: NextRequest) {
  try {
    const user = await requireRole(["COMPANY"]);
    const search = request.nextUrl.searchParams;
    const format = formatSchema.parse(search.get("format"));
    const report = await getCompanyReportData(user.id, {
      from: search.get("from") || undefined,
      to: search.get("to") || undefined,
      status: search.get("status") || undefined,
      motoboyId: search.get("motoboyId") || undefined,
      channel: search.get("channel") || undefined,
    });
    const content =
      format === "pdf"
        ? await createCompanyReportPdf(report)
        : createCompanyReportXlsx(report);
    const from = report.period.from.slice(0, 10);
    const to = new Date(new Date(report.period.to).getTime() - 1)
      .toISOString()
      .slice(0, 10);
    return new NextResponse(new Uint8Array(content), {
      status: 200,
      headers: {
        "Content-Type":
          format === "pdf"
            ? "application/pdf"
            : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="vapor-entregas-${from}-${to}.${format}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return companyReportErrorResponse(error);
  }
}
