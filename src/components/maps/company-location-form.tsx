"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Card } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { trackMetaCustomEventOnce } from "@/lib/analytics/meta-pixel";
import {
  coordinatesMatch,
  normalizeCoordinates,
  type Coordinates,
} from "@/lib/maps/geo";
import {
  canonicalLocationFromResult,
  createLatestRequestGate,
  isLocationDefiningAddressField,
  mergeCanonicalAddress,
  type CanonicalLocation,
  type GeocodingResultPayload,
  type LocationSource,
} from "@/lib/maps/location";

import { AddressLocationPicker } from "./address-location-picker";

type City = "PETROLINA_PE" | "JUAZEIRO_BA";

export interface InitialCompanyLocation {
  id: string;
  label: string;
  address: string;
  number: string;
  neighborhood: string;
  complement: string;
  reference: string;
  city: City;
  state: "PE" | "BA";
  postalCode: string;
  latitude: number | null;
  longitude: number | null;
  isDefault: boolean;
}

const cityCenters: Record<City, Coordinates> = {
  PETROLINA_PE: { latitude: -9.3891, longitude: -40.5031 },
  JUAZEIRO_BA: { latitude: -9.4162, longitude: -40.5033 },
};

export function CompanyLocationForm({
  initial,
  onboarding = false,
  nextHref = "/app/empresa/entregas/nova",
}: {
  initial: InitialCompanyLocation;
  onboarding?: boolean;
  nextHref?: string;
}) {
  const [form, setForm] = useState(initial);
  const [coordinates, setCoordinates] = useState<Coordinates>(() =>
    initial.latitude !== null && initial.longitude !== null
      ? { latitude: initial.latitude, longitude: initial.longitude }
      : cityCenters[initial.city],
  );
  const [status, setStatus] = useState<
    | "idle"
    | "searching"
    | "reverse-searching"
    | "saving"
    | "saved"
    | "not-found"
    | "geocoding-error"
  >("idle");
  const [message, setMessage] = useState("");
  const [approximateAddress, setApproximateAddress] = useState("");
  const [addressSearch, setAddressSearch] = useState(() =>
    initial.address
      ? `${initial.address}, ${initial.number} - ${initial.neighborhood}`
      : "",
  );
  const [suggestions, setSuggestions] = useState<GeocodingResultPayload[]>([]);
  const [suggestionStatus, setSuggestionStatus] = useState<
    "idle" | "searching" | "error"
  >("idle");
  const [locationResolved, setLocationResolved] = useState(
    initial.latitude !== null && initial.longitude !== null,
  );
  const [canonicalLocation, setCanonicalLocation] =
    useState<CanonicalLocation | null>(() =>
      initial.latitude !== null && initial.longitude !== null
        ? {
            formattedAddress: `${initial.address}, ${initial.number} - ${initial.neighborhood}`,
            latitude: initial.latitude,
            longitude: initial.longitude,
            source: "saved_location",
            components: {
              street: initial.address,
              number: initial.number,
              neighborhood: initial.neighborhood,
              city: initial.city === "PETROLINA_PE" ? "Petrolina" : "Juazeiro",
              state: initial.state,
              postalCode: initial.postalCode || undefined,
            },
          }
        : null,
    );
  const [mapRecenterKey, setMapRecenterKey] = useState(0);
  const suggestionCache = useRef(new Map<string, GeocodingResultPayload[]>());
  const programmaticSearchValue = useRef<string | null>(
    initial.address
      ? `${initial.address}, ${initial.number} - ${initial.neighborhood}`
      : null,
  );
  const suggestionRequests = useRef(createLatestRequestGate());
  const geocodeRequests = useRef(createLatestRequestGate());
  const reverseRequests = useRef(createLatestRequestGate());
  const geocodeController = useRef<AbortController | null>(null);
  const reverseController = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      geocodeController.current?.abort();
      reverseController.current?.abort();
      suggestionRequests.current.invalidate();
      geocodeRequests.current.invalidate();
      reverseRequests.current.invalidate();
    },
    [],
  );

  useEffect(() => {
    if (programmaticSearchValue.current === addressSearch) {
      programmaticSearchValue.current = null;
      suggestionRequests.current.invalidate();
      return;
    }
    programmaticSearchValue.current = null;
    const query = addressSearch.trim();
    if (query.length < 3) {
      suggestionRequests.current.invalidate();
      return;
    }
    const cacheKey = `${form.city}:${query.toLocaleLowerCase("pt-BR")}`;
    const cached = suggestionCache.current.get(cacheKey);
    if (cached) {
      setSuggestions(cached);
      setSuggestionStatus("idle");
      return;
    }
    const requestId = suggestionRequests.current.next();
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSuggestionStatus("searching");
      try {
        const response = await fetch("/api/maps/suggestions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, city: form.city }),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("suggestions-unavailable");
        const payload = (await response.json()) as {
          results?: GeocodingResultPayload[];
        };
        if (!suggestionRequests.current.isLatest(requestId)) return;
        const results = (payload.results ?? []).slice(0, 5);
        if (suggestionCache.current.size >= 20) {
          const oldest = suggestionCache.current.keys().next().value;
          if (oldest) suggestionCache.current.delete(oldest);
        }
        suggestionCache.current.set(cacheKey, results);
        setSuggestions(results);
        setSuggestionStatus("idle");
      } catch (error) {
        if (
          !(error instanceof DOMException && error.name === "AbortError") &&
          suggestionRequests.current.isLatest(requestId)
        ) {
          setSuggestions([]);
          setSuggestionStatus("error");
        }
      }
    }, 450);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [addressSearch, form.city]);

  function updateField<Key extends keyof InitialCompanyLocation>(
    key: Key,
    value: InitialCompanyLocation[Key],
  ) {
    if (status === "saving") return;
    setForm((current) => ({ ...current, [key]: value }));
    const locationField =
      key === "address"
        ? "street"
        : key === "number"
          ? "number"
          : key === "neighborhood"
            ? "neighborhood"
            : key === "postalCode"
              ? "postalCode"
              : key === "complement"
                ? "complement"
                : key === "reference"
                  ? "reference"
                  : null;
    if (locationField && isLocationDefiningAddressField(locationField)) {
      geocodeRequests.current.invalidate();
      reverseRequests.current.invalidate();
      geocodeController.current?.abort();
      reverseController.current?.abort();
      setLocationResolved(false);
      setCanonicalLocation(null);
      setStatus("idle");
      setMessage(
        "O endereço mudou. Localize-o novamente para sincronizar o PIN.",
      );
    }
    if (status === "saved") setStatus("idle");
  }

  function chooseCity(city: City) {
    if (status === "saving") return;
    const state = city === "PETROLINA_PE" ? "PE" : "BA";
    setForm((current) => ({ ...current, city, state }));
    geocodeRequests.current.invalidate();
    reverseRequests.current.invalidate();
    geocodeController.current?.abort();
    reverseController.current?.abort();
    setCoordinates(cityCenters[city]);
    setMapRecenterKey((current) => current + 1);
    setSuggestions([]);
    setLocationResolved(false);
    setCanonicalLocation(null);
    setStatus("idle");
    setMessage("Localize o endereço novamente após alterar a cidade.");
  }

  function applyProviderLocation(
    result: GeocodingResultPayload,
    source: LocationSource,
    options: {
      exactCoordinates?: Coordinates;
      preserveEnteredNumber?: boolean;
    } = {},
  ) {
    const location = canonicalLocationFromResult(
      result,
      source,
      options.exactCoordinates,
    );
    if (!location) return false;
    const address = mergeCanonicalAddress(
      {
        street: form.address,
        number: form.number,
        neighborhood: form.neighborhood,
        postalCode: form.postalCode,
        city: form.city,
      },
      location,
      options.preserveEnteredNumber,
    );
    const nextAddress = address.street;
    const nextNumber = address.number;
    const nextNeighborhood = address.neighborhood;
    const nextPostalCode = address.postalCode;
    const nextCity = address.city;
    const nextState = nextCity === "PETROLINA_PE" ? "PE" : "BA";
    setForm((current) => ({
      ...current,
      address: nextAddress,
      number: nextNumber,
      neighborhood: nextNeighborhood,
      postalCode: nextPostalCode,
      city: nextCity,
      state: nextState,
    }));
    setCoordinates({
      latitude: location.latitude,
      longitude: location.longitude,
    });
    programmaticSearchValue.current = location.formattedAddress;
    setAddressSearch(location.formattedAddress);
    setApproximateAddress(location.formattedAddress);
    setSuggestions([]);
    const complete = Boolean(
      nextAddress.trim() && nextNumber.trim() && nextNeighborhood.trim(),
    );
    const synchronizedLocation: CanonicalLocation = {
      ...location,
      components: {
        ...location.components,
        street: nextAddress,
        number: nextNumber,
        neighborhood: nextNeighborhood,
        postalCode: nextPostalCode || undefined,
        city: nextCity === "PETROLINA_PE" ? "Petrolina" : "Juazeiro",
        state: nextState,
      },
    };
    setCanonicalLocation(complete ? synchronizedLocation : null);
    setLocationResolved(complete);
    return complete;
  }

  function chooseSuggestion(result: GeocodingResultPayload) {
    suggestionRequests.current.invalidate();
    geocodeRequests.current.invalidate();
    reverseRequests.current.invalidate();
    geocodeController.current?.abort();
    reverseController.current?.abort();
    const complete = applyProviderLocation(result, "autocomplete", {
      preserveEnteredNumber: false,
    });
    setMapRecenterKey((current) => current + 1);
    setSuggestions([]);
    setSuggestionStatus("idle");
    setStatus("idle");
    setMessage(
      complete
        ? "Endereço localizado. Confira o ponto no mapa antes de salvar."
        : "Endereço aproximado. Informe número e bairro, depois localize novamente.",
    );
  }

  function validateAddress() {
    if (
      !form.address.trim() ||
      !form.number.trim() ||
      !form.neighborhood.trim()
    ) {
      setMessage("Preencha rua, número e bairro antes de localizar.");
      return false;
    }
    return true;
  }

  async function locateAddress() {
    if (!validateAddress()) return;
    geocodeController.current?.abort();
    reverseController.current?.abort();
    reverseRequests.current.invalidate();
    const controller = new AbortController();
    geocodeController.current = controller;
    const requestId = geocodeRequests.current.next();
    setStatus("searching");
    setMessage("");
    try {
      const response = await fetch("/api/maps/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
        signal: controller.signal,
      });
      const payload = (await response.json()) as {
        error?: string;
        result?: GeocodingResultPayload;
      };
      if (!geocodeRequests.current.isLatest(requestId)) return;
      if (!response.ok || !payload.result) {
        setStatus(response.status === 404 ? "not-found" : "geocoding-error");
        setMessage(payload.error ?? "Não foi possível buscar o endereço.");
        return;
      }
      const complete = applyProviderLocation(payload.result, "geocode", {
        preserveEnteredNumber: true,
      });
      setMapRecenterKey((current) => current + 1);
      setStatus("idle");
      setMessage(
        complete
          ? "Endereço localizado. Confira o ponto no mapa antes de salvar."
          : "O endereço foi localizado de forma aproximada. Confira os campos e o PIN.",
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      if (!geocodeRequests.current.isLatest(requestId)) return;
      setStatus("geocoding-error");
      setMessage(
        "Busca indisponível. Você ainda pode posicionar o PIN manualmente.",
      );
    }
  }

  async function adjustPin(next: Coordinates) {
    if (status === "saving") return;
    const normalized = normalizeCoordinates(next);
    if (!normalized) {
      setStatus("geocoding-error");
      setMessage("Não foi possível usar esse ponto do mapa.");
      return;
    }
    geocodeController.current?.abort();
    geocodeRequests.current.invalidate();
    reverseController.current?.abort();
    const controller = new AbortController();
    reverseController.current = controller;
    const requestId = reverseRequests.current.next();
    setCoordinates(normalized);
    setLocationResolved(false);
    setCanonicalLocation(null);
    setStatus("reverse-searching");
    setMessage("Identificando o endereço do ponto marcado…");
    try {
      const response = await fetch("/api/maps/reverse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(normalized),
        signal: controller.signal,
      });
      const payload = (await response.json()) as {
        result?: GeocodingResultPayload | null;
      };
      if (!reverseRequests.current.isLatest(requestId)) return;
      if (!response.ok || !payload.result) {
        setStatus("geocoding-error");
        setMessage(
          "O ponto foi marcado no mapa, mas não conseguimos identificar o endereço completo. Tente novamente.",
        );
        return;
      }
      const complete = applyProviderLocation(payload.result, "pin", {
        exactCoordinates: normalized,
      });
      setStatus(complete ? "idle" : "geocoding-error");
      setMessage(
        complete
          ? "Ponto ajustado no mapa. O endereço foi sincronizado."
          : "Ponto preservado. Complete o número e localize novamente antes de salvar.",
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      if (!reverseRequests.current.isLatest(requestId)) return;
      setStatus("geocoding-error");
      setMessage(
        "O ponto foi marcado no mapa, mas não foi possível consultar o endereço agora. Tente novamente.",
      );
    }
  }

  async function save() {
    if (!validateAddress()) return;
    if (!locationResolved || !canonicalLocation) {
      setMessage(
        "Localize o endereço ou identifique novamente o PIN antes de salvar.",
      );
      return;
    }
    if (!coordinatesMatch(canonicalLocation, coordinates)) {
      setMessage(
        "O PIN mudou. Confirme novamente a localização antes de salvar.",
      );
      return;
    }
    setStatus("saving");
    setMessage("");
    try {
      const response = await fetch("/api/company/location", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          latitude: canonicalLocation.latitude,
          longitude: canonicalLocation.longitude,
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        location?: InitialCompanyLocation;
      };
      if (!response.ok || !payload.location) {
        setStatus("idle");
        setMessage(payload.error ?? "Não foi possível salvar a localização.");
        return;
      }
      setForm({
        ...payload.location,
        complement: payload.location.complement ?? "",
        reference: payload.location.reference ?? "",
        postalCode: payload.location.postalCode ?? "",
      });
      setCoordinates({
        latitude: payload.location.latitude!,
        longitude: payload.location.longitude!,
      });
      setCanonicalLocation({
        formattedAddress: `${payload.location.address}, ${payload.location.number} - ${payload.location.neighborhood}`,
        latitude: payload.location.latitude!,
        longitude: payload.location.longitude!,
        source: "saved_location",
        components: {
          street: payload.location.address,
          number: payload.location.number,
          neighborhood: payload.location.neighborhood,
          city:
            payload.location.city === "PETROLINA_PE" ? "Petrolina" : "Juazeiro",
          state: payload.location.state,
          postalCode: payload.location.postalCode || undefined,
        },
      });
      setLocationResolved(true);
      setStatus("saved");
      setMessage("Localização salva como ponto padrão de coleta.");
      if (onboarding) {
        trackMetaCustomEventOnce(
          `company-location-configured:${payload.location.id}`,
          "CompanyLocationConfigured",
        );
      }
    } catch {
      setStatus("idle");
      setMessage("Não foi possível salvar agora. Tente novamente.");
    }
  }

  return (
    <div className="space-y-6">
      <AddressLocationPicker
        idPrefix="company-location"
        eyebrow={form.isDefault ? "Ponto padrão" : "Localização da loja"}
        title="Localização da sua empresa"
        description="Defina onde os motoboys irão retirar os pedidos. Pesquise o endereço ou ajuste o PIN na entrada correta."
        searchValue={addressSearch}
        onSearchChange={(value) => {
          programmaticSearchValue.current = null;
          suggestionRequests.current.invalidate();
          setAddressSearch(value);
          setSuggestions([]);
          setSuggestionStatus("idle");
        }}
        suggestions={suggestions}
        suggestionStatus={suggestionStatus}
        onSelectSuggestion={chooseSuggestion}
        address={{
          street: form.address,
          number: form.number,
          neighborhood: form.neighborhood,
          postalCode: form.postalCode,
          city: form.city,
          state: form.state,
          complement: form.complement,
          reference: form.reference,
        }}
        onAddressChange={(field, value) => {
          const target = field === "street" ? "address" : field;
          updateField(target, value);
        }}
        onCityChange={chooseCity}
        onLocate={() => void locateAddress()}
        coordinates={coordinates}
        onPinChange={(next) => void adjustPin(next)}
        recenterKey={mapRecenterKey}
        locationResolved={locationResolved}
        confirmed={status === "saved"}
        formattedAddress={approximateAddress}
        message={message}
        messageTone={
          status === "saved"
            ? "success"
            : status === "geocoding-error" || status === "not-found"
              ? "error"
              : locationResolved
                ? "success"
                : "warning"
        }
        identifying={status === "searching" || status === "reverse-searching"}
        disabled={status === "saving"}
        primaryLabel={
          onboarding ? "Confirmar localização" : "Salvar localização"
        }
        primaryDoneLabel="Localização salva"
        primaryLoading={status === "saving"}
        primaryDisabled={
          status === "searching" ||
          status === "reverse-searching" ||
          !locationResolved
        }
        onPrimaryAction={() => void save()}
        onRetry={
          status === "geocoding-error"
            ? () => void adjustPin(coordinates)
            : undefined
        }
        extraControl={
          <div className="sm:col-span-2">
            <FormField
              label="Nome do local"
              htmlFor="company-location-label"
              required
            >
              <Input
                id="company-location-label"
                value={form.label}
                onChange={(event) => updateField("label", event.target.value)}
              />
            </FormField>
          </div>
        }
      />
      {onboarding && status === "saved" && (
        <Card className="border-green-200 bg-green-50 p-6 sm:p-7">
          <p className="text-xs font-extrabold uppercase tracking-[.16em] text-green-700">
            Tudo pronto!
          </p>
          <h2 className="mt-2 font-display text-2xl font-extrabold text-ink">
            Sua loja está configurada.
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            O endereço e o PIN foram salvos juntos como ponto padrão de coleta.
          </p>
          <Link
            href={nextHref}
            className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-brand px-5 text-sm font-bold text-white shadow-[0_8px_20px_rgba(234,29,44,.2)] transition hover:bg-brand-hover sm:w-auto"
          >
            {nextHref.includes("entregas/nova")
              ? "Criar primeira entrega"
              : "Ir para a Vapor"}
          </Link>
        </Card>
      )}
    </div>
  );
}
