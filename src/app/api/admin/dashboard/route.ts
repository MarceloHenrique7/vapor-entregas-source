import { NextRequest, NextResponse } from "next/server";
import { getAdminDashboard } from "@/server/admin/admin-service";
import { requireAdminActor } from "@/server/admin/request";
import { adminErrorResponse } from "@/server/admin/route-response";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const query = Object.fromEntries(request.nextUrl.searchParams);
    return NextResponse.json(
      { metrics: await getAdminDashboard(await requireAdminActor(), query) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return adminErrorResponse(error);
  }
}
