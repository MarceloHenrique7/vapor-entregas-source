import type { Role } from "@/server/auth/types";

export interface LocationActor {
  userId: string;
  role: Role;
}

export interface CompanyLocationRecord {
  id: string;
  companyId: string;
  label: string;
  address: string;
  number: string;
  neighborhood: string;
  complement?: string;
  reference?: string;
  city: "PETROLINA_PE" | "JUAZEIRO_BA";
  state: "PE" | "BA";
  postalCode?: string;
  latitude: number;
  longitude: number;
  isDefault: boolean;
}
