import { NextResponse } from "next/server";

import { requireRole } from "@/server/auth/guards";
import { listImportedOrders } from "@/server/integrations/integration-service";
import { integrationErrorResponse } from "@/server/integrations/route-response";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireRole(["COMPANY"]);
    return NextResponse.json(
      { orders: await listImportedOrders(user.id) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return integrationErrorResponse(error);
  }
}
