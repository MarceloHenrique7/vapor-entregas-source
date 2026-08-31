import { NextRequest, NextResponse } from "next/server";
import {
  getOwnAccount,
  updateOwnAccount,
} from "@/server/account/account-service";
import { prismaAccountRepository } from "@/server/account/prisma-account-repository";
import { enforceAccountRateLimit } from "@/server/account/rate-limit";
import { requireAccountActor } from "@/server/account/request";
import { accountErrorResponse } from "@/server/account/route-response";
import { hasValidRequestOrigin } from "@/server/http/origin";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    return NextResponse.json(
      {
        account: await getOwnAccount(
          await requireAccountActor(),
          prismaAccountRepository,
        ),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return accountErrorResponse(error);
  }
}
export async function PATCH(request: NextRequest) {
  if (!hasValidRequestOrigin(request))
    return NextResponse.json(
      { error: "Origem da requisição inválida." },
      { status: 403 },
    );
  try {
    const actor = await requireAccountActor();
    enforceAccountRateLimit(actor.userId, "profile");
    return NextResponse.json({
      account: await updateOwnAccount(
        actor,
        await request.json(),
        prismaAccountRepository,
      ),
    });
  } catch (error) {
    return accountErrorResponse(error);
  }
}
