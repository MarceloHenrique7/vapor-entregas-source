import { NextRequest, NextResponse } from "next/server";

import { requireRole } from "@/server/auth/guards";
import { getCompanyProOverview } from "@/server/company-pro/company-pro-service";
import { companyProErrorResponse } from "@/server/company-pro/route-response";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await requireRole(["COMPANY"]);
    const search = request.nextUrl.searchParams;
    const overview = await getCompanyProOverview(user.id, {
      period: search.get("period") || undefined,
      from: search.get("from") || undefined,
      to: search.get("to") || undefined,
    });
    return NextResponse.json(
      { overview },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return companyProErrorResponse(error);
  }
}
