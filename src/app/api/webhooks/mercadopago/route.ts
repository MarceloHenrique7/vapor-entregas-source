import { NextRequest, NextResponse } from "next/server";

import { getSubscriptionEnv } from "@/server/config/env";
import { mercadoPagoPaymentProvider } from "@/server/payments/mercado-pago-payment-provider";
import { processAccessPaymentWebhook } from "@/server/payments/payment-service";
import { prismaPaymentRepository } from "@/server/payments/prisma-payment-repository";
import { mercadoPagoSubscriptionProvider } from "@/server/subscriptions/mercado-pago-provider";
import { prismaSubscriptionRepository } from "@/server/subscriptions/prisma-subscription-repository";
import { subscriptionErrorResponse } from "@/server/subscriptions/route-response";
import { mercadoPagoWebhookSchema } from "@/server/subscriptions/schemas";
import { processMercadoPagoWebhook } from "@/server/subscriptions/subscription-service";
import { validateMercadoPagoSignature } from "@/server/subscriptions/webhook-signature";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const env = getSubscriptionEnv();
    const dataId = request.nextUrl.searchParams.get("data.id");
    const requestId = request.headers.get("x-request-id");
    validateMercadoPagoSignature({
      xSignature: request.headers.get("x-signature"),
      xRequestId: requestId,
      dataId,
      secret: env.MERCADO_PAGO_WEBHOOK_SECRET,
    });
    const body = mercadoPagoWebhookSchema.parse(await request.json());
    const resourceId = String(body.data.id);
    if (!dataId || resourceId.toLowerCase() !== dataId.toLowerCase()) {
      return NextResponse.json(
        { error: "Recurso divergente." },
        { status: 401 },
      );
    }
    if (
      body.live_mode !== undefined &&
      ((env.MERCADO_PAGO_MODE === "test" && body.live_mode) ||
        (env.MERCADO_PAGO_MODE === "production" && !body.live_mode))
    ) {
      return NextResponse.json(
        { error: "Evento pertence a outro ambiente." },
        { status: 409 },
      );
    }
    const eventId = body.id
      ? `mp:${String(body.id)}`
      : `mp:${requestId}:${body.type}:${body.action ?? "updated"}:${resourceId}`;
    const result =
      body.type === "payment"
        ? await processAccessPaymentWebhook(
            {
              eventId,
              action: body.action ?? null,
              resourceId,
            },
            prismaSubscriptionRepository,
            prismaPaymentRepository,
            mercadoPagoPaymentProvider,
            new Date(),
          )
        : await processMercadoPagoWebhook(
            {
              eventId,
              type: body.type,
              action: body.action ?? null,
              resourceId,
            },
            prismaSubscriptionRepository,
            mercadoPagoSubscriptionProvider,
            new Date(),
          );
    return NextResponse.json({
      received: true,
      duplicate: result === "duplicate",
    });
  } catch (error) {
    return subscriptionErrorResponse(error);
  }
}
