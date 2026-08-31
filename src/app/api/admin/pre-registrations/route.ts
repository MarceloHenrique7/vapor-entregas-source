import { NextResponse } from "next/server";

import { requireAdminActor } from "@/server/admin/request";
import { getPreRegistrationAdminOverview } from "@/server/pre-registration/pre-registration-service";
import { prismaPreRegistrationRepository } from "@/server/pre-registration/prisma-pre-registration-repository";
import { preRegistrationErrorResponse } from "@/server/pre-registration/route-response";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const actor = await requireAdminActor();
    const metrics = await getPreRegistrationAdminOverview(
      actor,
      prismaPreRegistrationRepository,
    );
    return NextResponse.json(
      { metrics },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return preRegistrationErrorResponse(error);
  }
}
