import { NextResponse } from "next/server";
import { getAdminDashboard } from "@/server/admin/admin-service";
import { requireAdminActor } from "@/server/admin/request";
import { adminErrorResponse } from "@/server/admin/route-response";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    return NextResponse.json(
      { metrics: await getAdminDashboard(await requireAdminActor()) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return adminErrorResponse(error);
  }
}
