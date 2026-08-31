import { NextRequest, NextResponse } from "next/server";
import { exportOwnData } from "@/server/account/account-service";
import { prismaAccountRepository } from "@/server/account/prisma-account-repository";
import { enforceAccountRateLimit } from "@/server/account/rate-limit";
import { requireAccountActor } from "@/server/account/request";
import { accountErrorResponse } from "@/server/account/route-response";
import { getSensitiveDataEnv } from "@/server/config/env";
import { hasValidRequestOrigin } from "@/server/http/origin";
export async function POST(request: NextRequest) {
  if (!hasValidRequestOrigin(request))
    return NextResponse.json(
      { error: "Origem da requisição inválida." },
      { status: 403 },
    );
  try {
    const actor = await requireAccountActor();
    enforceAccountRateLimit(actor.userId, "export");
    const data = await exportOwnData(
      actor,
      await request.json(),
      prismaAccountRepository,
      getSensitiveDataEnv().FIELD_ENCRYPTION_KEY,
    );
    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="vapor-entregas-meus-dados.json"',
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return accountErrorResponse(error);
  }
}
