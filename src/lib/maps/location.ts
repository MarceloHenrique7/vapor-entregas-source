import {
  isValidCoordinates,
  normalizeCoordinates,
  type Coordinates,
} from "./geo";

export type LocationSource =
  "autocomplete" | "geocode" | "pin" | "coordinates" | "saved_location";

export interface AddressComponents {
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface GeocodingResultPayload extends Coordinates {
  displayName?: string;
  formattedAddress?: string;
  placeId?: string;
  address?: {
    road?: string;
    houseNumber?: string;
    neighborhood?: string;
    postalCode?: string;
    city?: string;
    state?: string;
    country?: string;
  };
  components?: AddressComponents;
}

export interface CanonicalLocation extends Coordinates {
  formattedAddress: string;
  source: LocationSource;
  placeId?: string;
  components: AddressComponents;
}

export type LocationAddressField =
  | "street"
  | "number"
  | "neighborhood"
  | "postalCode"
  | "city"
  | "state"
  | "complement"
  | "reference";

export type SupportedLocationCity = "PETROLINA_PE" | "JUAZEIRO_BA";

export interface StructuredAddressDraft {
  street: string;
  number: string;
  neighborhood: string;
  postalCode: string;
  city: SupportedLocationCity;
}

export const ADDRESS_WITHOUT_NUMBER = "s/n";
export const UNKNOWN_NEIGHBORHOOD = "Bairro não informado";
export const PINNED_LOCATION_STREET = "Local marcado no mapa";

export function isLocationDefiningAddressField(field: LocationAddressField) {
  return field !== "complement" && field !== "reference";
}

export function resolveSupportedCity(
  components: AddressComponents,
  fallback: SupportedLocationCity,
): SupportedLocationCity {
  const state = components.state?.toLocaleLowerCase("pt-BR");
  const city = components.city?.toLocaleLowerCase("pt-BR");
  if (
    state?.includes("bahia") ||
    state === "ba" ||
    city?.includes("juazeiro")
  ) {
    return "JUAZEIRO_BA";
  }
  if (
    state?.includes("pernambuco") ||
    state === "pe" ||
    city?.includes("petrolina")
  ) {
    return "PETROLINA_PE";
  }
  return fallback;
}

export function mergeCanonicalAddress(
  current: StructuredAddressDraft,
  location: Pick<CanonicalLocation, "components">,
  preserveEnteredNumber = false,
): StructuredAddressDraft {
  return {
    street: location.components.street ?? current.street,
    number:
      location.components.number ??
      (preserveEnteredNumber ? current.number : ""),
    neighborhood: location.components.neighborhood ?? current.neighborhood,
    postalCode:
      location.components.postalCode?.replace(/\D/g, "") ?? current.postalCode,
    city: resolveSupportedCity(location.components, current.city),
  };
}

export function completeCanonicalAddress(
  current: StructuredAddressDraft,
  location: Pick<CanonicalLocation, "components" | "formattedAddress">,
  options: {
    preserveCurrentAddress?: boolean;
    preserveEnteredNumber?: boolean;
  } = {},
): StructuredAddressDraft {
  const base = options.preserveCurrentAddress
    ? current
    : {
        street: "",
        number: options.preserveEnteredNumber ? current.number : "",
        neighborhood: "",
        postalCode: "",
        city: current.city,
      };
  const merged = mergeCanonicalAddress(
    base,
    location,
    options.preserveEnteredNumber,
  );
  const formattedStreet = location.formattedAddress.split(",")[0]?.trim();
  return {
    ...merged,
    street: merged.street.trim() || formattedStreet || PINNED_LOCATION_STREET,
    number: merged.number.trim() || ADDRESS_WITHOUT_NUMBER,
    neighborhood: merged.neighborhood.trim() || UNKNOWN_NEIGHBORHOOD,
  };
}

export function createPinnedLocationFallback(
  coordinates: Coordinates,
  city: SupportedLocationCity,
): { location: CanonicalLocation; address: StructuredAddressDraft } | null {
  const normalized = normalizeCoordinates(coordinates);
  if (!normalized) return null;
  const state = city === "PETROLINA_PE" ? "PE" : "BA";
  const cityName = city === "PETROLINA_PE" ? "Petrolina" : "Juazeiro";
  const formattedAddress = `${normalized.latitude.toFixed(6)}, ${normalized.longitude.toFixed(6)}`;
  const address: StructuredAddressDraft = {
    street: PINNED_LOCATION_STREET,
    number: ADDRESS_WITHOUT_NUMBER,
    neighborhood: UNKNOWN_NEIGHBORHOOD,
    postalCode: "",
    city,
  };
  return {
    address,
    location: {
      ...normalized,
      formattedAddress,
      source: "pin",
      components: {
        street: address.street,
        number: address.number,
        neighborhood: address.neighborhood,
        city: cityName,
        state,
      },
    },
  };
}

function clean(value: unknown) {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized || undefined;
}

export function normalizeGeocodingResult(
  result: GeocodingResultPayload,
): Omit<CanonicalLocation, "source"> | null {
  const coordinates = normalizeCoordinates(result);
  if (!coordinates) return null;
  const components = result.components ?? {
    street: result.address?.road,
    number: result.address?.houseNumber,
    neighborhood: result.address?.neighborhood,
    city: result.address?.city,
    state: result.address?.state,
    postalCode: result.address?.postalCode,
    country: result.address?.country,
  };
  const formattedAddress =
    clean(result.formattedAddress) ??
    clean(result.displayName) ??
    `${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}`;
  return {
    ...coordinates,
    formattedAddress,
    ...(clean(result.placeId) ? { placeId: clean(result.placeId) } : {}),
    components: {
      ...(clean(components.street) ? { street: clean(components.street) } : {}),
      ...(clean(components.number) ? { number: clean(components.number) } : {}),
      ...(clean(components.neighborhood)
        ? { neighborhood: clean(components.neighborhood) }
        : {}),
      ...(clean(components.city) ? { city: clean(components.city) } : {}),
      ...(clean(components.state) ? { state: clean(components.state) } : {}),
      ...(clean(components.postalCode)
        ? { postalCode: clean(components.postalCode) }
        : {}),
      ...(clean(components.country)
        ? { country: clean(components.country) }
        : {}),
    },
  };
}

export function canonicalLocationFromResult(
  result: GeocodingResultPayload,
  source: LocationSource,
  exactCoordinates?: Coordinates,
): CanonicalLocation | null {
  const normalized = normalizeGeocodingResult(result);
  if (!normalized) return null;
  const coordinates = exactCoordinates
    ? normalizeCoordinates(exactCoordinates)
    : { latitude: normalized.latitude, longitude: normalized.longitude };
  if (!coordinates) return null;
  return { ...normalized, ...coordinates, source };
}

export function createLatestRequestGate() {
  let latest = 0;
  return {
    next() {
      latest += 1;
      return latest;
    },
    invalidate() {
      latest += 1;
    },
    isLatest(requestId: number) {
      return requestId === latest;
    },
  };
}

export function hasValidCanonicalLocation(
  location: CanonicalLocation | null,
): location is CanonicalLocation {
  return Boolean(
    location &&
    location.formattedAddress.trim() &&
    isValidCoordinates(location),
  );
}
