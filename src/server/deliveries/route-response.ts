import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { ForbiddenError, UnauthenticatedError } from "@/server/auth/errors";
import { internalErrorResponse } from "@/server/observability/logger";
import { SubscriptionRequiredError } from "@/server/subscriptions/errors";

import {
  CompanyProfileRequiredError,
  DefaultPickupRequiredError,
  DeliveryRateLimitError,
  DeliveryAccessDeniedError,
  DeliveryExtrasAcknowledgementRequiredError,
  DeliveryNotFoundError,
  DeliveryTransitionConflictError,
  DeliveryUnavailableError,
  InvalidDeliveryTransitionError,
  MotoboyPresenceRequiredError,
} from "./errors";

export function deliveryErrorResponse(error: unknown) {
  if (error instanceof SyntaxError) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Revise os dados da entrega.",
        fields: error.flatten().fieldErrors,
      },
      { status: 422 },
    );
  }
  if (error instanceof UnauthenticatedError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
  if (error instanceof ForbiddenError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  if (error instanceof SubscriptionRequiredError) {
    return NextResponse.json(
      { error: error.message, code: "SUBSCRIPTION_REQUIRED" },
      { status: 402 },
    );
  }
  if (error instanceof DeliveryAccessDeniedError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  if (error instanceof DeliveryNotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  if (
    error instanceof CompanyProfileRequiredError ||
    error instanceof DefaultPickupRequiredError
  ) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }
  if (error instanceof MotoboyPresenceRequiredError) {
    return NextResponse.json(
      { error: error.message, code: "MOTOBOY_OFFLINE" },
      { status: 409 },
    );
  }
  if (error instanceof DeliveryUnavailableError) {
    return NextResponse.json(
      { error: error.message, code: "DELIVERY_UNAVAILABLE" },
      { status: 409 },
    );
  }
  if (error instanceof DeliveryExtrasAcknowledgementRequiredError) {
    return NextResponse.json(
      { error: error.message, code: "EXTRAS_ACKNOWLEDGEMENT_REQUIRED" },
      { status: 409 },
    );
  }
  if (
    error instanceof InvalidDeliveryTransitionError ||
    error instanceof DeliveryTransitionConflictError
  ) {
    return NextResponse.json(
      { error: error.message, code: "INVALID_DELIVERY_TRANSITION" },
      { status: 409 },
    );
  }
  if (error instanceof DeliveryRateLimitError) {
    return NextResponse.json(
      { error: error.message },
      {
        status: 429,
        headers: { "Retry-After": String(error.retryAfterSeconds) },
      },
    );
  }
  return internalErrorResponse("api.deliveries", error);
}
