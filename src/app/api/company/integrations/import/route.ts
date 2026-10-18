import { NextRequest, NextResponse } from "next/server";

import { requireRole } from "@/server/auth/guards";
import { hasValidRequestOrigin } from "@/server/http/origin";
import { importOrdersCsv } from "@/server/integrations/integration-service";
import { enforceIntegrationRateLimit } from "@/server/integrations/rate-limit";
import { integrationErrorResponse } from "@/server/integrations/route-response";

export async function POST(request: NextRequest) {
  if (!hasValidRequestOrigin(request))
    return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
  try {
    const user = await requireRole(["COMPANY"]);
    enforceIntegrationRateLimit(`csv:${user.id}`, 10);
    const result = await importOrdersCsv(user.id, await request.json());
    return NextResponse.json(
      { result },
      { status: result.confirmed ? 201 : 200 },
    );
  } catch (error) {
    return integrationErrorResponse(error);
  }
}
