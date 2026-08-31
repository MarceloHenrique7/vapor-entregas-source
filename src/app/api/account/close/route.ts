import { NextRequest, NextResponse } from "next/server";
import { closeOwnAccount } from "@/server/account/account-service";
import { prismaAccountRepository } from "@/server/account/prisma-account-repository";
import { enforceAccountRateLimit } from "@/server/account/rate-limit";
import { requireAccountActor } from "@/server/account/request";
import { accountErrorResponse } from "@/server/account/route-response";
import { revokeCurrentSession } from "@/server/auth/session";
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
    enforceAccountRateLimit(actor.userId, "close");
    await closeOwnAccount(
      actor,
      await request.json(),
      prismaAccountRepository,
      getSensitiveDataEnv().FIELD_ENCRYPTION_KEY,
    );
    await revokeCurrentSession();
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return accountErrorResponse(error);
  }
}
