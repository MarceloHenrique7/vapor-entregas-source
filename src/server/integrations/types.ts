export type ProviderCode = "GENERIC_WEBHOOK" | "MANUAL_CSV" | "IFOOD";

export interface NormalizedImportedOrder {
  externalId: string;
  channel: string;
  externalStatus?: string;
  externalCreatedAt?: Date;
  lastEventAt?: Date;
  logisticsMode?: string;
  eligibleForOwnDelivery: boolean;
  destinationAddress?: string;
  destinationNumber?: string;
  destinationNeighborhood?: string;
  destinationComplement?: string;
  destinationReference?: string;
  destinationPhone?: string;
  destinationCity?: "PETROLINA_PE" | "JUAZEIRO_BA";
  destinationState?: "PE" | "BA";
  destinationPostalCode?: string;
  notes?: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface OrderProviderAdapter<TInput = unknown> {
  readonly code: ProviderCode;
  readonly label: string;
  normalize(input: TInput): NormalizedImportedOrder;
}
