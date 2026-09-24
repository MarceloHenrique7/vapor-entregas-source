import type { SessionUser } from "@/server/auth/types";

export const PRELAUNCH_PUBLIC_PAGES = [
  "/",
  "/form",
  "/entrar",
  "/cadastro/empresa",
  "/cadastro/motoboy",
  "/admin/acesso",
  "/acesso/teste",
  "/termos",
  "/privacidade",
  "/regras",
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
  ["/api/auth/login", new Set(["POST"])],
  ["/api/auth/register/company", new Set(["POST"])],
  ["/api/auth/register/motoboy", new Set(["POST"])],
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
  const publicTrackingPage =
    normalizedMethod === "GET" && /^\/r\/[A-Za-z0-9_-]{43}$/.test(pathname);
  const publicTrackingApi =
    normalizedMethod === "GET" &&
    /^\/api\/tracking\/[A-Za-z0-9_-]{43}$/.test(pathname);
  if (publicTrackingPage || publicTrackingApi) return true;
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

const sharedPreparationRequests = new Map<string, ReadonlySet<string>>([
  ["/cadastro/concluido", new Set(["GET"])],
  ["/api/auth/session", new Set(["GET"])],
  ["/api/auth/logout", new Set(["POST"])],
  ["/api/account/profile", new Set(["GET", "PATCH"])],
  ["/api/account/password", new Set(["POST"])],
  ["/api/account/export", new Set(["POST"])],
  ["/api/account/close", new Set(["POST"])],
]);

const companyPreparationRequests = new Map<string, ReadonlySet<string>>([
  ["/app/empresa/configuracoes", new Set(["GET"])],
  ["/app/empresa/configuracoes/localizacao", new Set(["GET"])],
  ["/api/company/location", new Set(["GET", "PUT"])],
  ["/api/maps/geocode", new Set(["POST"])],
  ["/api/maps/reverse", new Set(["POST"])],
  ["/api/maps/suggestions", new Set(["POST"])],
]);

const motoboyPreparationRequests = new Map<string, ReadonlySet<string>>([
  ["/app/motoboy/configuracoes", new Set(["GET"])],
]);

export function canAccessPrelaunchPreparation(
  user: Pick<SessionUser, "role" | "status"> | null,
  pathname: string,
  method: string,
) {
  if (!user || user.status !== "ACTIVE") return false;
  const normalizedMethod = method.toUpperCase();
  if (sharedPreparationRequests.get(pathname)?.has(normalizedMethod)) {
    return user.role === "COMPANY" || user.role === "MOTOBOY";
  }
  const roleRequests =
    user.role === "COMPANY"
      ? companyPreparationRequests
      : user.role === "MOTOBOY"
        ? motoboyPreparationRequests
        : null;
  return roleRequests?.get(pathname)?.has(normalizedMethod) ?? false;
}

export type PrelaunchGateDecision =
  "DISABLED" | "PUBLIC" | "PREPARATION" | "AUTHORIZED" | "BLOCKED";

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
  if (canAccessPrelaunchPreparation(input.user, input.pathname, input.method)) {
    return "PREPARATION";
  }
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
