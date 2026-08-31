import { NextRequest, NextResponse } from "next/server";

import { requireRole } from "@/server/auth/guards";
import { hasValidRequestOrigin } from "@/server/http/origin";
import { prismaReputationRepository } from "@/server/reputation/prisma-reputation-repository";
import { enforceReportRateLimit } from "@/server/reputation/report-rate-limit";
import {
  createReport,
  listOwnReports,
} from "@/server/reputation/reputation-service";
import { reputationErrorResponse } from "@/server/reputation/route-response";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireRole(["COMPANY", "MOTOBOY"]);
    const reports = await listOwnReports(
      { userId: user.id, role: user.role },
      prismaReputationRepository,
    );
    return NextResponse.json(
      { reports },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return reputationErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  if (!hasValidRequestOrigin(request)) {
    return NextResponse.json(
      { error: "Origem da requisição inválida." },
      { status: 403 },
    );
  }
  try {
    const user = await requireRole(["COMPANY", "MOTOBOY"]);
    enforceReportRateLimit(user.id);
    const report = await createReport(
      { userId: user.id, role: user.role },
      await request.json(),
      prismaReputationRepository,
      new Date(),
    );
    return NextResponse.json({ report }, { status: 201 });
  } catch (error) {
    return reputationErrorResponse(error);
  }
}
