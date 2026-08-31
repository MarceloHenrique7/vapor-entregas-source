import type { Role } from "./types";

const ROUTE_POLICIES = [
  { prefix: "/admin", roles: ["ADMIN"] },
  { prefix: "/app/motoboy", roles: ["MOTOBOY"] },
  { prefix: "/app/empresa", roles: ["COMPANY"] },
] as const satisfies ReadonlyArray<{
  prefix: string;
  roles: readonly Role[];
}>;

export function getAllowedRolesForPath(
  pathname: string,
): readonly Role[] | null {
  const policy = ROUTE_POLICIES.find(
    ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  return policy?.roles ?? null;
}

export function canRoleAccessPath(role: Role, pathname: string): boolean {
  const roles = getAllowedRolesForPath(pathname);
  return roles === null || roles.includes(role);
}
