import { NextRequest, NextResponse } from "next/server";

import { createSession } from "@/server/auth/session";
import { getSensitiveDataEnv } from "@/server/config/env";
import { hasValidRequestOrigin } from "@/server/http/origin";
import { prismaRegistrationRepository } from "@/server/registration/prisma-registration-repository";
import { registerCompany } from "@/server/registration/register";
import { registrationErrorResponse } from "@/server/registration/route-response";
import { companyRegistrationSchema } from "@/server/registration/schemas";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!hasValidRequestOrigin(request)) {
    return NextResponse.json(
      { error: "Origem da requisição inválida." },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const parsed = companyRegistrationSchema.safeParse(body);
  if (!parsed.success) {
    return registrationErrorResponse(parsed.error);
  }

  let encryptionKey: string;
  try {
    encryptionKey = getSensitiveDataEnv().FIELD_ENCRYPTION_KEY;
  } catch {
    return NextResponse.json(
      { error: "Cadastro temporariamente indisponível." },
      { status: 503 },
    );
  }

  try {
    const user = await registerCompany(
      parsed.data,
      prismaRegistrationRepository,
      encryptionKey,
    );
    await createSession(user.id);
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    return registrationErrorResponse(error);
  }
}
