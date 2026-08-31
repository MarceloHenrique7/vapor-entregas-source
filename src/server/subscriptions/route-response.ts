import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { ForbiddenError, UnauthenticatedError } from "@/server/auth/errors";
import {
  internalErrorResponse,
  logServerError,
} from "@/server/observability/logger";

import {
  InvalidWebhookSignatureError,
  SubscriptionConflictError,
  SubscriptionNotFoundError,
  SubscriptionProviderError,
  SubscriptionProviderNotConfiguredError,
  SubscriptionRateLimitError,
  SubscriptionRequiredError,
} from "./errors";

export function subscriptionErrorResponse(error: unknown) {
  if (error instanceof SyntaxError || error instanceof ZodError) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 422 });
  }
  if (error instanceof UnauthenticatedError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
  if (error instanceof ForbiddenError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  if (error instanceof InvalidWebhookSignatureError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
  if (error instanceof SubscriptionRequiredError) {
    return NextResponse.json(
      { error: error.message, code: "SUBSCRIPTION_REQUIRED" },
      { status: 402 },
    );
  }
  if (error instanceof SubscriptionNotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  if (error instanceof SubscriptionConflictError) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }
  if (error instanceof SubscriptionProviderNotConfiguredError) {
    return NextResponse.json({ error: error.message }, { status: 503 });
  }
  if (error instanceof SubscriptionProviderError) {
    const correlationId = logServerError("api.subscriptions.provider", error);
    return NextResponse.json(
      { error: error.message, correlationId },
      { status: 502 },
    );
  }
  if (error instanceof SubscriptionRateLimitError) {
    return NextResponse.json(
      { error: error.message },
      {
        status: 429,
        headers: { "Retry-After": String(error.retryAfterSeconds) },
      },
    );
  }
  return internalErrorResponse("api.subscriptions", error);
}
