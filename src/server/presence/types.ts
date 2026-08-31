import type { Role } from "@/server/auth/types";

export interface PresenceActor {
  userId: string;
  role: Role;
}

export interface MotoboyPresenceRecord {
  motoboyId: string;
  userId: string;
  isOnline: boolean;
  onlineSince: Date | null;
  lastLocationAt: Date | null;
  lastLatitude: number | null;
  lastLongitude: number | null;
}

export interface PublicMotoboyPresence {
  isOnline: boolean;
  onlineSince: string | null;
  lastLocationAt: string | null;
  expiresAt: string | null;
}
