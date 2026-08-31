import { NextRequest, NextResponse } from "next/server";

import { enforceAdminRateLimit } from "@/server/admin/admin-rate-limit";
import { requireAdminActor } from "@/server/admin/request";
import { adminErrorResponse } from "@/server/admin/route-response";
import { hasValidRequestOrigin } from "@/server/http/origin";
import {
  listPricingRules,
  replacePricingRule,
} from "@/server/pricing/pricing-service";
import { prismaPricingRepository } from "@/server/pricing/prisma-pricing-repository";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const actor = await requireAdminActor();
    const rules = await listPricingRules(actor, prismaPricingRepository);
    return NextResponse.json(
      { rules },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  if (!hasValidRequestOrigin(request))
    return NextResponse.json(
      { error: "Origem da requisição inválida." },
      { status: 403 },
    );
  try {
    const actor = await requireAdminActor();
    enforceAdminRateLimit(actor.userId);
    const rule = await replacePricingRule(
      actor,
      await request.json(),
      prismaPricingRepository,
      new Date(),
    );
    return NextResponse.json({ rule }, { status: 201 });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
