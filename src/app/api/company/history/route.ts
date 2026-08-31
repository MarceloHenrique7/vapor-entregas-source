import { NextRequest, NextResponse } from "next/server";

import { requireRole } from "@/server/auth/guards";
import {
  listCompanyHistory,
  parseSearchParams,
} from "@/server/company-history/company-history-service";
import { prismaCompanyHistoryRepository } from "@/server/company-history/prisma-company-history-repository";
import { deliveryErrorResponse } from "@/server/deliveries/route-response";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await requireRole(["COMPANY"]);
    const result = await listCompanyHistory(
      { userId: user.id, role: user.role },
      parseSearchParams(request.nextUrl.searchParams),
      prismaCompanyHistoryRepository,
    );
    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return deliveryErrorResponse(error);
  }
}
