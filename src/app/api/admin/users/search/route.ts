import { NextRequest, NextResponse } from "next/server";
import { listAdminUsers } from "@/server/admin/admin-service";
import { requireAdminActor } from "@/server/admin/request";
import { adminErrorResponse } from "@/server/admin/route-response";
import { hasValidRequestOrigin } from "@/server/http/origin";
export async function POST(request: NextRequest) {
  if (!hasValidRequestOrigin(request))
    return NextResponse.json(
      { error: "Origem da requisição inválida." },
      { status: 403 },
    );
  try {
    return NextResponse.json(
      await listAdminUsers(await requireAdminActor(), await request.json()),
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return adminErrorResponse(error);
  }
}
