import { NextRequest, NextResponse } from "next/server";

import { requireRole } from "@/server/auth/guards";
import { hasValidRequestOrigin } from "@/server/http/origin";
import {
  listCompanyIntegrations,
  revokeGenericWebhook,
  rotateGenericWebhook,
} from "@/server/integrations/integration-service";
import { enforceIntegrationRateLimit } from "@/server/integrations/rate-limit";
import { integrationErrorResponse } from "@/server/integrations/route-response";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireRole(["COMPANY"]);
    return NextResponse.json(
      { integrations: await listCompanyIntegrations(user.id) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return integrationErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  if (!hasValidRequestOrigin(request))
    return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
  try {
    const user = await requireRole(["COMPANY"]);
    enforceIntegrationRateLimit(`credential:${user.id}`, 5);
    const credential = await rotateGenericWebhook(user.id);
    return NextResponse.json({ credential }, { status: 201 });
  } catch (error) {
    return integrationErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  if (!hasValidRequestOrigin(request))
    return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
  try {
    const user = await requireRole(["COMPANY"]);
    enforceIntegrationRateLimit(`credential:${user.id}`, 5);
    await revokeGenericWebhook(user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return integrationErrorResponse(error);
  }
}
