import { NextRequest, NextResponse } from "next/server";

import { changeCompanyProAccess } from "@/server/admin/admin-service";
import { requireAdminActor } from "@/server/admin/request";
import { adminErrorResponse } from "@/server/admin/route-response";
import { hasValidRequestOrigin } from "@/server/http/origin";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!hasValidRequestOrigin(request)) {
    return NextResponse.json(
      { error: "Origem da requisição inválida." },
      { status: 403 },
    );
  }
  try {
    const { id } = await context.params;
    const result = await changeCompanyProAccess(
      await requireAdminActor(),
      id,
      await request.json(),
    );
    return NextResponse.json(result);
  } catch (error) {
    return adminErrorResponse(error);
  }
}
