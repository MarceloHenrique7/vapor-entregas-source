import { NextRequest, NextResponse } from "next/server";

import { requireRole } from "@/server/auth/guards";
import { hasValidRequestOrigin } from "@/server/http/origin";
import {
  notifyPlanPaymentApproved,
  runNotificationTask,
} from "@/server/notifications/notification-service";
import { mercadoPagoPaymentProvider } from "@/server/payments/mercado-pago-payment-provider";
import { createAccessPayment } from "@/server/payments/payment-service";
import { prismaPaymentRepository } from "@/server/payments/prisma-payment-repository";
import { prismaSubscriptionRepository } from "@/server/subscriptions/prisma-subscription-repository";
import { enforceSubscriptionRateLimit } from "@/server/subscriptions/rate-limit";
import { subscriptionErrorResponse } from "@/server/subscriptions/route-response";

export async function POST(request: NextRequest) {
  if (!hasValidRequestOrigin(request)) {
    return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
  }
  try {
    const user = await requireRole(["MOTOBOY", "COMPANY"]);
    enforceSubscriptionRateLimit(user.id);
    const result = await createAccessPayment(
      { userId: user.id, role: user.role, status: user.status },
      await request.json(),
      prismaSubscriptionRepository,
      prismaPaymentRepository,
      mercadoPagoPaymentProvider,
      new Date(),
      ({ userId, providerPaymentId }) =>
        runNotificationTask("plan-payment-approved", () =>
          notifyPlanPaymentApproved({ userId, paymentId: providerPaymentId }),
        ),
    );
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return subscriptionErrorResponse(error);
  }
}
