import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { ForbiddenError, UnauthenticatedError } from "@/server/auth/errors";
import { internalErrorResponse } from "@/server/observability/logger";

import {
  ImportedOrderNotFoundError,
  IntegrationNotFoundError,
  IntegrationProfileRequiredError,
  IntegrationRateLimitError,
  IntegrationSignatureError,
} from "./errors";

export function integrationErrorResponse(error: unknown) {
  if (error instanceof SyntaxError)
    return NextResponse.json(
      { error: "Payload JSON inválido." },
      { status: 400 },
    );
  if (error instanceof ZodError)
    return NextResponse.json(
      {
        error: "Revise os dados da integração.",
        fields: error.flatten().fieldErrors,
      },
      { status: 422 },
    );
  if (error instanceof UnauthenticatedError)
    return NextResponse.json({ error: error.message }, { status: 401 });
  if (error instanceof ForbiddenError)
    return NextResponse.json({ error: error.message }, { status: 403 });
  if (error instanceof IntegrationSignatureError)
    return NextResponse.json({ error: error.message }, { status: 401 });
  if (
    error instanceof IntegrationNotFoundError ||
    error instanceof ImportedOrderNotFoundError
  )
    return NextResponse.json({ error: error.message }, { status: 404 });
  if (error instanceof IntegrationProfileRequiredError)
    return NextResponse.json({ error: error.message }, { status: 409 });
  if (error instanceof IntegrationRateLimitError)
    return NextResponse.json(
      { error: error.message },
      {
        status: 429,
        headers: { "Retry-After": String(error.retryAfterSeconds) },
      },
    );
  if (error instanceof Error && error.message.includes("no máximo 200"))
    return NextResponse.json({ error: error.message }, { status: 422 });
  return internalErrorResponse("api.integrations", error);
}
