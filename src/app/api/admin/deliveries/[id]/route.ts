import { NextResponse } from "next/server";
import { getAdminDelivery } from "@/server/admin/admin-service";
import { requireAdminActor } from "@/server/admin/request";
import { adminErrorResponse } from "@/server/admin/route-response";
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    return NextResponse.json(
      { delivery: await getAdminDelivery(await requireAdminActor(), id) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return adminErrorResponse(error);
  }
}
