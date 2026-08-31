import { NextRequest, NextResponse } from "next/server";

import { enforceAdminRateLimit } from "@/server/admin/admin-rate-limit";
import { requireAdminActor } from "@/server/admin/request";
import { hasValidRequestOrigin } from "@/server/http/origin";
import { prismaSubscriptionRepository } from "@/server/subscriptions/prisma-subscription-repository";
import { subscriptionErrorResponse } from "@/server/subscriptions/route-response";
import { updateSubscriptionPlan } from "@/server/subscriptions/subscription-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdminActor();
    const plans = (await prismaSubscriptionRepository.listPlans()).map(
      (plan) => ({
        id: plan.id,
        role: plan.role,
        name: plan.name,
        description: plan.description,
        monthlyPrice: plan.monthlyPrice,
        active: plan.active,
        trialDays: plan.trialDays,
      }),
    );
    return NextResponse.json(
      { plans },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return subscriptionErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  if (!hasValidRequestOrigin(request)) {
    return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
  }
  try {
    const actor = await requireAdminActor();
    enforceAdminRateLimit(actor.userId);
    const body = await request.json();
    const plan = await updateSubscriptionPlan(
      actor,
      body.planId,
      {
        monthlyPrice: body.monthlyPrice,
        active: body.active,
        trialDays: body.trialDays,
      },
      prismaSubscriptionRepository,
      new Date(),
    );
    return NextResponse.json({ plan });
  } catch (error) {
    return subscriptionErrorResponse(error);
  }
}
