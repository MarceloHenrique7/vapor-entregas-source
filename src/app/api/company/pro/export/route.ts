import { NextRequest, NextResponse } from "next/server";

import { requireRole } from "@/server/auth/guards";
import { exportCompanyProCsv } from "@/server/company-pro/company-pro-service";
import { companyProErrorResponse } from "@/server/company-pro/route-response";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await requireRole(["COMPANY"]);
    const search = request.nextUrl.searchParams;
    const result = await exportCompanyProCsv(user.id, {
      period: search.get("period") || undefined,
      from: search.get("from") || undefined,
      to: search.get("to") || undefined,
    });
    return new NextResponse(result.content, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${result.filename}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return companyProErrorResponse(error);
  }
}
