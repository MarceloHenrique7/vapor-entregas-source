import { NextRequest, NextResponse } from "next/server";

import { requireRole } from "@/server/auth/guards";
import { hasValidRequestOrigin } from "@/server/http/origin";
import { subscriptionErrorResponse } from "@/server/subscriptions/route-response";

export async function POST(request: NextRequest) {
  if (!hasValidRequestOrigin(request)) {
    return NextResponse.json({ error: "Origem invalida." }, { status: 403 });
  }
  try {
    await requireRole(["ADMIN"]);
    return NextResponse.json(
      {
        error:
          "A sincronização de planos recorrentes foi desativada. O fluxo atual usa pagamentos avulsos.",
      },
      { status: 410 },
    );
  } catch (error) {
    return subscriptionErrorResponse(error);
  }
}
