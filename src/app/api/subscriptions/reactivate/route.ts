import { NextRequest, NextResponse } from "next/server";

import { requireRole } from "@/server/auth/guards";
import { hasValidRequestOrigin } from "@/server/http/origin";
import { subscriptionErrorResponse } from "@/server/subscriptions/route-response";

export async function POST(request: NextRequest) {
  if (!hasValidRequestOrigin(request)) {
    return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
  }
  try {
    await requireRole(["MOTOBOY", "COMPANY"]);
    return NextResponse.json(
      {
        error:
          "A reativação recorrente foi desativada. Use a página de assinatura para comprar 30 dias de acesso.",
      },
      { status: 410 },
    );
  } catch (error) {
    return subscriptionErrorResponse(error);
  }
}
