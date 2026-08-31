import { NextRequest, NextResponse } from "next/server";

import { enforceAdminRateLimit } from "@/server/admin/admin-rate-limit";
import { requireAdminActor } from "@/server/admin/request";
import { hasValidRequestOrigin } from "@/server/http/origin";
import { exportPreRegistrationsCsv } from "@/server/pre-registration/pre-registration-service";
import { prismaPreRegistrationRepository } from "@/server/pre-registration/prisma-pre-registration-repository";
import { preRegistrationErrorResponse } from "@/server/pre-registration/route-response";

export async function POST(request: NextRequest) {
  if (!hasValidRequestOrigin(request)) {
    return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
  }
  try {
    const actor = await requireAdminActor();
    enforceAdminRateLimit(actor.userId);
    const csv = await exportPreRegistrationsCsv(
      actor,
      await request.json(),
      prismaPreRegistrationRepository,
    );
    return new NextResponse(`\uFEFF${csv}`, {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="vapor-pre-cadastros.csv"',
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return preRegistrationErrorResponse(error);
  }
}
