import { NextRequest, NextResponse } from "next/server";

import { SESSION_COOKIE_NAME } from "@/server/auth/session-constants";
import { getSessionUserByToken } from "@/server/auth/session-lookup";
import { getPrelaunchEnv } from "@/server/config/env";
import {
  evaluatePrelaunchGate,
  isNormallyProtectedPage,
  PRELAUNCH_ACCESS_PAGES,
} from "@/server/prelaunch/policy";

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const hasSessionCookie = request.cookies.has(SESSION_COOKIE_NAME);
  const prelaunch = getPrelaunchEnv();

  if (prelaunch.enabled) {
    const isPublic = evaluatePrelaunchGate({
      enabled: true,
      pathname,
      method: request.method,
      user: null,
      testUserIds: prelaunch.testUserIds,
    });
    const accessPageWithCookie =
      PRELAUNCH_ACCESS_PAGES.has(pathname) && hasSessionCookie;
    if (isPublic === "PUBLIC" && !accessPageWithCookie) {
      return NextResponse.next();
    }
    const sessionUser = hasSessionCookie
      ? await getSessionUserByToken(
          request.cookies.get(SESSION_COOKIE_NAME)?.value,
        )
      : null;
    const decision = evaluatePrelaunchGate({
      enabled: true,
      pathname,
      method: request.method,
      user: sessionUser,
      testUserIds: prelaunch.testUserIds,
    });
    if (decision === "AUTHORIZED") {
      return NextResponse.next();
    }
    if (isPublic === "PUBLIC") {
      return NextResponse.redirect(new URL("/", request.url));
    }
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        {
          error: sessionUser
            ? "Acesso indisponível durante o pré-lançamento."
            : "Autenticação necessária.",
          code: sessionUser ? "PRELAUNCH_FORBIDDEN" : "UNAUTHENTICATED",
        },
        {
          status: sessionUser ? 403 : 401,
          headers: { "Cache-Control": "private, no-store" },
        },
      );
    }
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (!isNormallyProtectedPage(pathname) || hasSessionCookie) {
    return NextResponse.next();
  }

  const redirectUrl = new URL("/", request.url);
  redirectUrl.searchParams.set("auth", "required");
  redirectUrl.searchParams.set(
    "next",
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );

  return NextResponse.redirect(redirectUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
