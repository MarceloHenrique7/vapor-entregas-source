import { NextRequest, NextResponse } from "next/server";

import { requireRole } from "@/server/auth/guards";
import {
  listCompanyMotoboys,
  parseSearchParams,
} from "@/server/company-history/company-history-service";
import { prismaCompanyHistoryRepository } from "@/server/company-history/prisma-company-history-repository";
import { getPresenceEnv } from "@/server/config/env";
import { deliveryErrorResponse } from "@/server/deliveries/route-response";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await requireRole(["COMPANY"]);
    const result = await listCompanyMotoboys(
      { userId: user.id, role: user.role },
      parseSearchParams(request.nextUrl.searchParams),
      prismaCompanyHistoryRepository,
      new Date(),
      getPresenceEnv().ONLINE_PRESENCE_TTL_MINUTES,
    );
    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return deliveryErrorResponse(error);
  }
}
