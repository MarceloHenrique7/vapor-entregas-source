import { NextRequest, NextResponse } from "next/server";
import { listAdminDeliveries } from "@/server/admin/admin-service";
import { requireAdminActor, searchParamsObject } from "@/server/admin/request";
import { adminErrorResponse } from "@/server/admin/route-response";
export async function GET(request: NextRequest) {
  try {
    return NextResponse.json(
      await listAdminDeliveries(
        await requireAdminActor(),
        searchParamsObject(request.nextUrl.searchParams),
      ),
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return adminErrorResponse(error);
  }
}
