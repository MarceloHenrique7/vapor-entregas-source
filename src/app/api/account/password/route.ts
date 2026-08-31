import { NextRequest, NextResponse } from "next/server";
import { changeOwnPassword } from "@/server/account/account-service";
import { prismaAccountRepository } from "@/server/account/prisma-account-repository";
import { enforceAccountRateLimit } from "@/server/account/rate-limit";
import { requireAccountActor } from "@/server/account/request";
import { accountErrorResponse } from "@/server/account/route-response";
import { createSession } from "@/server/auth/session";
import { hasValidRequestOrigin } from "@/server/http/origin";
export async function POST(request: NextRequest) {
  if (!hasValidRequestOrigin(request))
    return NextResponse.json(
      { error: "Origem da requisição inválida." },
      { status: 403 },
    );
  try {
    const actor = await requireAccountActor();
    enforceAccountRateLimit(actor.userId, "password");
    await changeOwnPassword(
      actor,
      await request.json(),
      prismaAccountRepository,
    );
    await createSession(actor.userId);
    return NextResponse.json({
      message: "Senha alterada. As outras sessões foram encerradas.",
    });
  } catch (error) {
    return accountErrorResponse(error);
  }
}
