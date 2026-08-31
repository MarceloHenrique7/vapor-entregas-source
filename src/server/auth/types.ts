export const ROLES = ["MOTOBOY", "COMPANY", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export const USER_STATUSES = [
  "ACTIVE",
  "SUSPENDED",
  "BLOCKED",
  "DELETED",
] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface SessionUser extends AuthenticatedUser {
  status: UserStatus;
}
