import { NextRequest, NextResponse } from "next/server";

import { requireRole } from "@/server/auth/guards";
import { hasValidRequestOrigin } from "@/server/http/origin";
import { enforceLocationRateLimit } from "@/server/locations/rate-limit";
import { locationErrorResponse } from "@/server/locations/route-response";
import { geocodingSuggestionSchema } from "@/server/locations/schemas";
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
    const query = geocodingSuggestionSchema.parse(await request.json());
    const results = await getGeocodingProvider().search(query, 5);
    return NextResponse.json(
      { results },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return locationErrorResponse(error);
  }
}
