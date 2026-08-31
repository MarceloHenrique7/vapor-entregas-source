import { NextRequest, NextResponse } from "next/server";

import { hasValidRequestOrigin } from "@/server/http/origin";
import { PreRegistrationPayloadTooLargeError } from "@/server/pre-registration/errors";
import { createPreRegistration } from "@/server/pre-registration/pre-registration-service";
import { prismaPreRegistrationRepository } from "@/server/pre-registration/prisma-pre-registration-repository";
import {
  enforcePreRegistrationRateLimit,
  getPreRegistrationRateLimitKey,
} from "@/server/pre-registration/rate-limit";
import { preRegistrationErrorResponse } from "@/server/pre-registration/route-response";

const MAX_PAYLOAD_BYTES = 2_048;

export async function POST(request: NextRequest) {
  if (!hasValidRequestOrigin(request)) {
    return NextResponse.json(
      { error: "Origem da requisição inválida." },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }
  try {
    const declaredLength = Number(request.headers.get("content-length") ?? 0);
    if (declaredLength > MAX_PAYLOAD_BYTES) {
      throw new PreRegistrationPayloadTooLargeError();
    }
    enforcePreRegistrationRateLimit(getPreRegistrationRateLimitKey(request));
    const text = await request.text();
    if (new TextEncoder().encode(text).byteLength > MAX_PAYLOAD_BYTES) {
      throw new PreRegistrationPayloadTooLargeError();
    }
    const result = await createPreRegistration(
      JSON.parse(text),
      prismaPreRegistrationRepository,
      new Date(),
    );
    return NextResponse.json(
      {
        status: result.created ? "created" : "existing",
        message: result.created
          ? "Você está na lista!"
          : "Você já está na lista.",
      },
      {
        status: result.created ? 201 : 200,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    return preRegistrationErrorResponse(error);
  }
}
