export type PreRegistrationType = "MOTOBOY" | "COMPANY";

export interface PreRegistrationRecord {
  id: string;
  name: string;
  phone: string;
  normalizedPhone: string;
  type: PreRegistrationType;
  consentNoticeVersion: string;
  consentRecordedAt: Date;
  createdAt: Date;
}

export interface PreRegistrationFilters {
  page: number;
  pageSize: number;
  query?: string;
  type?: PreRegistrationType;
  from?: Date;
  to?: Date;
}

export interface PreRegistrationRepository {
  createOrFind(input: {
    name: string;
    phone: string;
    normalizedPhone: string;
    type: PreRegistrationType;
    consentNoticeVersion: string;
    now: Date;
  }): Promise<{ record: PreRegistrationRecord; created: boolean }>;
  metrics(): Promise<{ total: number; motoboys: number; companies: number }>;
  list(filters: PreRegistrationFilters): Promise<{
    items: PreRegistrationRecord[];
    total: number;
  }>;
  exportRows(
    filters: Omit<PreRegistrationFilters, "page" | "pageSize">,
    limit: number,
  ): Promise<PreRegistrationRecord[]>;
}
