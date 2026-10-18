import { NextRequest, NextResponse } from "next/server";

import { requireRole } from "@/server/auth/guards";
import {
  getCompanyReportData,
  listCompanyReportMotoboys,
} from "@/server/company-reports/report-service";
import { companyReportErrorResponse } from "@/server/company-reports/route-response";

export const dynamic = "force-dynamic";

function filters(request: NextRequest) {
  const search = request.nextUrl.searchParams;
  return {
    from: search.get("from") || undefined,
    to: search.get("to") || undefined,
    status: search.get("status") || undefined,
    motoboyId: search.get("motoboyId") || undefined,
    channel: search.get("channel") || undefined,
  };
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireRole(["COMPANY"]);
    const [report, motoboys] = await Promise.all([
      getCompanyReportData(user.id, filters(request)),
      listCompanyReportMotoboys(user.id),
    ]);
    return NextResponse.json(
      { report: { ...report, rows: report.rows.slice(0, 50) }, motoboys },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return companyReportErrorResponse(error);
  }
}
