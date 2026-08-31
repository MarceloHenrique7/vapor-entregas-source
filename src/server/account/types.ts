import type { Role, UserStatus } from "@/server/auth/types";

export interface AccountActor {
  userId: string;
  role: Role;
}

export interface AccountOverview {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  status: UserStatus;
  city: string | null;
  fantasyName: string | null;
  documentMasked: string | null;
  birthDate: string | null;
  vehiclePlate: string | null;
  createdAt: string;
  legalAcceptances: Array<{
    documentType: "TERMS_OF_USE" | "PRIVACY_POLICY";
    documentVersion: string;
    acceptedAt: string;
  }>;
}

export interface AccountCredentials {
  passwordHash: string;
}

export interface AccountExportRecord {
  account: {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: Role;
    status: UserStatus;
    createdAt: Date;
    updatedAt: Date;
  };
  motoboyProfile: null | {
    cpfEncrypted: string;
    rgEncrypted: string;
    birthDate: Date;
    city: string;
    vehiclePlate: string | null;
    isOnline: boolean;
    onlineSince: Date | null;
    lastLocationAt: Date | null;
    lastLatitude: number | null;
    lastLongitude: number | null;
  };
  companyProfile: null | {
    fantasyName: string;
    documentType: string;
    legalDocumentEncrypted: string;
    city: string;
    locations: Array<{
      label: string;
      address: string;
      number: string;
      neighborhood: string;
      complement: string | null;
      reference: string | null;
      city: string;
      state: string;
      postalCode: string | null;
      latitude: number | null;
      longitude: number | null;
      isDefault: boolean;
    }>;
  };
  deliveries: Array<Record<string, unknown>>;
  ratingsGiven: Array<Record<string, unknown>>;
  ratingsReceived: Array<Record<string, unknown>>;
  favorites: Array<Record<string, unknown>>;
  reportsCreated: Array<Record<string, unknown>>;
  reportsReceivedCount: number;
  legalAcceptances: Array<Record<string, unknown>>;
}

export interface ClosureAnonymization {
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  protectedMarker: string;
  protectedFingerprint: string;
}
