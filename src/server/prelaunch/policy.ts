import type { SessionUser } from "@/server/auth/types";

export const PRELAUNCH_PUBLIC_PAGES = [
  "/",
  "/form",
  "/admin/acesso",
  "/acesso/teste",
  "/termos",
  "/privacidade",
  "/manifest.webmanifest",
  "/robots.txt",
  "/sw.js",
  "/favicon.ico",
] as const;

export const PRELAUNCH_PUBLIC_ASSETS = [
  "/icons/vapor-entregas-192.png",
  "/icons/vapor-entregas-512.png",
  "/icons/vapor-entregas-maskable-512.png",
  "/icons/vapor-entregas-icon.svg",
] as const;

export const PRELAUNCH_PUBLIC_API_METHODS = new Map<
  string,
  ReadonlySet<string>
>([
  ["/api/pre-registration", new Set(["POST"])],
  ["/api/prelaunch/login/admin", new Set(["POST"])],
  ["/api/prelaunch/login/test", new Set(["POST"])],
  ["/api/webhooks/mercadopago", new Set(["POST"])],
]);

const publicPages = new Set<string>(PRELAUNCH_PUBLIC_PAGES);
const publicAssets = new Set<string>(PRELAUNCH_PUBLIC_ASSETS);

export const PRELAUNCH_ACCESS_PAGES = new Set([
  "/admin/acesso",
  "/acesso/teste",
]);

export function isPrelaunchPublicRequest(pathname: string, method: string) {
  const normalizedMethod = method.toUpperCase();
  if (
    normalizedMethod === "GET" &&
    (publicPages.has(pathname) || publicAssets.has(pathname))
  ) {
    return true;
  }
  return (
    PRELAUNCH_PUBLIC_API_METHODS.get(pathname)?.has(normalizedMethod) ?? false
  );
}

export function canBypassPrelaunch(
  user: Pick<SessionUser, "id" | "role" | "status"> | null,
  testUserIds: readonly string[],
) {
  if (!user || user.status !== "ACTIVE") return false;
  return user.role === "ADMIN" || testUserIds.includes(user.id);
}

export type PrelaunchGateDecision =
  "DISABLED" | "PUBLIC" | "AUTHORIZED" | "BLOCKED";

export function evaluatePrelaunchGate(input: {
  enabled: boolean;
  pathname: string;
  method: string;
  user: Pick<SessionUser, "id" | "role" | "status"> | null;
  testUserIds: readonly string[];
}): PrelaunchGateDecision {
  if (!input.enabled) return "DISABLED";
  if (isPrelaunchPublicRequest(input.pathname, input.method)) return "PUBLIC";
  if (canBypassPrelaunch(input.user, input.testUserIds)) return "AUTHORIZED";
  return "BLOCKED";
}

export function isNormallyProtectedPage(pathname: string) {
  return (
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/app/motoboy" ||
    pathname.startsWith("/app/motoboy/") ||
    pathname === "/app/empresa" ||
    pathname.startsWith("/app/empresa/")
  );
}
