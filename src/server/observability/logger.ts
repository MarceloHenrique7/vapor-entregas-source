import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

const PRISMA_ERROR_CODE = /^P\d{4}$/;

function safeErrorDetails(error: unknown) {
  if (!(error instanceof Error)) return { errorType: "UnknownError" };
  const candidate = error as Error & { code?: unknown };
  return {
    errorType: error.name || "Error",
    ...(typeof candidate.code === "string" &&
    PRISMA_ERROR_CODE.test(candidate.code)
      ? { errorCode: candidate.code }
      : {}),
  };
}

export function logServerError(scope: string, error: unknown) {
  const correlationId = randomUUID();
  console.error(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "error",
      scope,
      correlationId,
      ...safeErrorDetails(error),
    }),
  );
  return correlationId;
}

export function internalErrorResponse(scope: string, error: unknown) {
  const correlationId = logServerError(scope, error);
  return NextResponse.json(
    {
      error: "Não foi possível concluir esta operação agora.",
      code: "INTERNAL_ERROR",
      correlationId,
    },
    { status: 500, headers: { "Cache-Control": "private, no-store" } },
  );
}
