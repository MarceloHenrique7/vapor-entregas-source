import { NextRequest, NextResponse } from "next/server";
import { changeAdminUserStatus } from "@/server/admin/admin-service";
import { enforceAdminRateLimit } from "@/server/admin/admin-rate-limit";
import { requireAdminActor } from "@/server/admin/request";
import { adminErrorResponse } from "@/server/admin/route-response";
import { hasValidRequestOrigin } from "@/server/http/origin";
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!hasValidRequestOrigin(request))
    return NextResponse.json(
      { error: "Origem da requisição inválida." },
      { status: 403 },
    );
  try {
    const actor = await requireAdminActor();
    enforceAdminRateLimit(actor.userId);
    const { id } = await context.params;
    return NextResponse.json(
      await changeAdminUserStatus(actor, id, await request.json()),
    );
  } catch (error) {
    return adminErrorResponse(error);
  }
}
