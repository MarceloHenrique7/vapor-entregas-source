import { NextRequest, NextResponse } from "next/server";

import { requireRole } from "@/server/auth/guards";
import { hasValidRequestOrigin } from "@/server/http/origin";
import { locationErrorResponse } from "@/server/locations/route-response";
import { geocodingQuerySchema } from "@/server/locations/schemas";
import { enforceLocationRateLimit } from "@/server/locations/rate-limit";
import { getGeocodingProvider } from "@/server/maps/geocoding-service";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!hasValidRequestOrigin(request)) {
    return NextResponse.json(
      { error: "Origem da requisição inválida." },
      { status: 403 },
    );
  }
  try {
    const user = await requireRole(["COMPANY", "ADMIN"]);
    enforceLocationRateLimit(user.id);
    const query = geocodingQuerySchema.parse(await request.json());
    const result = await getGeocodingProvider().geocode(query);
    if (!result) {
      return NextResponse.json(
        { error: "Endereço não encontrado. Posicione o PIN manualmente." },
        { status: 404 },
      );
    }
    return NextResponse.json({ result });
  } catch (error) {
    return locationErrorResponse(error);
  }
}
