"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";

import { CompanyLocationMapLoader } from "@/components/maps/company-location-map-loader";
import { Icon } from "@/components/icons/icon";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  DELIVERY_EXTRAS_NOTICE,
  DELIVERY_EXTRA_TYPE_LABELS,
  DIRECT_PAYMENT_NOTICE,
  PAYMENT_METHOD_LABELS,
} from "@/config/delivery";
import { trackMetaCustomEvent } from "@/lib/analytics/meta-pixel";
import {
  calculateStraightLineDistance,
  coordinatesMatch,
  normalizeCoordinates,
  parseCoordinatesInput,
  type Coordinates,
} from "@/lib/maps/geo";
import {
  canonicalLocationFromResult,
  createLatestRequestGate,
  isLocationDefiningAddressField,
  mergeCanonicalAddress,
  type GeocodingResultPayload,
  type CanonicalLocation,
  type LocationSource,
} from "@/lib/maps/location";

type City = "PETROLINA_PE" | "JUAZEIRO_BA";
type PaymentMethod = keyof typeof PAYMENT_METHOD_LABELS;
type ExtraType = keyof typeof DELIVERY_EXTRA_TYPE_LABELS;

interface PlannedExtra {
  type: ExtraType;
  enabled: boolean;
  description: string;
  amount: string;
  note: string;
}

interface DeliveryQuote {
  distanceEstimateKm: number;
  distanceMethod: "STRAIGHT_LINE" | "GOOGLE_ROUTES";
  routeDurationSeconds: number | null;
  distanceLabel: string;
  suggestedPrice: number | null;
  pricingRuleId: string | null;
}

type AddressSuggestion = GeocodingResultPayload;

export interface PickupSummary {
  companyName: string;
  label: string;
  address: string;
  number: string;
  neighborhood: string;
  city: City;
  state: string;
  latitude: number;
  longitude: number;
}

interface RepeatDeliveryDraft {
  id: string;
  pickupAddress: string;
  pickupNumber: string;
  pickupNeighborhood: string;
  destinationAddress: string;
  destinationNumber: string;
  destinationNeighborhood: string;
  destinationComplement: string | null;
  destinationReference: string | null;
  destinationCity: City;
  destinationState: string;
  destinationPostalCode: string | null;
  destinationLatitude: number;
  destinationLongitude: number;
  offeredPrice: number;
  paymentMethod: PaymentMethod;
  notes: string | null;
  extras?: Array<{
    type: ExtraType;
    description: string;
    amount: number | null;
    note: string | null;
  }>;
}

const initialExtras: PlannedExtra[] = (
  Object.keys(DELIVERY_EXTRA_TYPE_LABELS) as ExtraType[]
).map((type) => ({
  type,
  enabled: false,
  description: DELIVERY_EXTRA_TYPE_LABELS[type],
  amount: "",
  note: "",
}));

const cityCenters: Record<City, Coordinates> = {
  PETROLINA_PE: { latitude: -9.3891, longitude: -40.5031 },
  JUAZEIRO_BA: { latitude: -9.4162, longitude: -40.5033 },
};

export function NewDeliveryForm({
  pickup,
  repeatDeliveryId,
}: {
  pickup: PickupSummary;
  repeatDeliveryId?: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    destinationAddress: "",
    destinationNumber: "",
    destinationNeighborhood: "",
    destinationComplement: "",
    destinationReference: "",
    destinationCity: pickup.city,
    destinationState: pickup.city === "PETROLINA_PE" ? "PE" : "BA",
    destinationPostalCode: "",
    offeredPrice: "",
    paymentMethod: "PIX" as PaymentMethod,
    notes: "",
  });
  const [coordinates, setCoordinates] = useState<Coordinates>(
    cityCenters[pickup.city],
  );
  const [pinConfirmed, setPinConfirmed] = useState(false);
  const [locationResolved, setLocationResolved] = useState(false);
  const [selectedLocation, setSelectedLocation] =
    useState<CanonicalLocation | null>(null);
  const [confirmedLocation, setConfirmedLocation] =
    useState<CanonicalLocation | null>(null);
  const [addressSearch, setAddressSearch] = useState("");
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [suggestionStatus, setSuggestionStatus] = useState<
    "idle" | "searching" | "error"
  >("idle");
  const [locationMessage, setLocationMessage] = useState("");
  const suggestionCache = useRef(new Map<string, AddressSuggestion[]>());
  const programmaticSearchValue = useRef<string | null>(null);
  const suggestionRequests = useRef(createLatestRequestGate());
  const geocodeRequests = useRef(createLatestRequestGate());
  const reverseRequests = useRef(createLatestRequestGate());
  const quoteRequests = useRef(createLatestRequestGate());
  const geocodeController = useRef<AbortController | null>(null);
  const reverseController = useRef<AbortController | null>(null);
  const [mapRecenterKey, setMapRecenterKey] = useState(0);
  const [status, setStatus] = useState<"idle" | "searching" | "publishing">(
    "idle",
  );
  const [message, setMessage] = useState("");
  const [approximateAddress, setApproximateAddress] = useState("");
  const [repeatSource, setRepeatSource] = useState<RepeatDeliveryDraft | null>(
    null,
  );
  const [extras, setExtras] = useState<PlannedExtra[]>(initialExtras);
  const [quote, setQuote] = useState<DeliveryQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState("");
  const distance = useMemo(
    () =>
      calculateStraightLineDistance(
        { latitude: pickup.latitude, longitude: pickup.longitude },
        coordinates,
      ),
    [coordinates, pickup.latitude, pickup.longitude],
  );

  useEffect(
    () => () => {
      geocodeController.current?.abort();
      reverseController.current?.abort();
      suggestionRequests.current.invalidate();
      geocodeRequests.current.invalidate();
      reverseRequests.current.invalidate();
      quoteRequests.current.invalidate();
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
    if (query.length < 3 || parseCoordinatesInput(query)) {
      suggestionRequests.current.invalidate();
      return;
    }
    const cacheKey = `${form.destinationCity}:${query.toLocaleLowerCase("pt-BR")}`;
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
          signal: controller.signal,
          body: JSON.stringify({ query, city: form.destinationCity }),
        });
        const payload = (await response.json()) as {
          results?: AddressSuggestion[];
        };
        if (!response.ok) throw new Error("suggestions-unavailable");
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
          (error as Error).name !== "AbortError" &&
          suggestionRequests.current.isLatest(requestId)
        ) {
          setSuggestions([]);
          setSuggestionStatus("error");
        }
      }
    }, 450);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [addressSearch, form.destinationCity]);

  useEffect(() => {
    if (!pinConfirmed) {
      quoteRequests.current.invalidate();
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clearing a quote invalidated by a changed PIN
      setQuote(null);
      setQuoteLoading(false);
      setQuoteError("");
      return;
    }
    const requestId = quoteRequests.current.next();
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setQuoteLoading(true);
      setQuoteError("");
      try {
        const response = await fetch("/api/deliveries/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            destinationLatitude: coordinates.latitude,
            destinationLongitude: coordinates.longitude,
            destinationCity: form.destinationCity,
          }),
        });
        const payload = (await response.json()) as {
          quote?: DeliveryQuote;
          error?: string;
        };
        if (!quoteRequests.current.isLatest(requestId)) return;
        if (!response.ok || !payload.quote) {
          setQuoteError(
            payload.error ?? "A sugestão de valor está indisponível.",
          );
          return;
        }
        setQuote(payload.quote);
      } catch (error) {
        if (
          (error as Error).name !== "AbortError" &&
          quoteRequests.current.isLatest(requestId)
        )
          setQuoteError("A sugestão de valor está indisponível.");
      } finally {
        if (
          !controller.signal.aborted &&
          quoteRequests.current.isLatest(requestId)
        )
          setQuoteLoading(false);
      }
    }, 500);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [coordinates, form.destinationCity, pinConfirmed]);

  useEffect(() => {
    if (!repeatDeliveryId) return;
    let active = true;
    async function loadDraft() {
      setStatus("searching");
      try {
        const response = await fetch(
          `/api/company/history/${repeatDeliveryId}/repeat`,
          { cache: "no-store" },
        );
        const payload = (await response.json()) as {
          draft?: RepeatDeliveryDraft;
          error?: string;
        };
        if (!response.ok || !payload.draft) {
          if (active)
            setMessage(
              payload.error ?? "Não foi possível carregar o rascunho.",
            );
          return;
        }
        if (!active) return;
        const draft = payload.draft;
        setRepeatSource(draft);
        setForm({
          destinationAddress: draft.destinationAddress,
          destinationNumber: draft.destinationNumber,
          destinationNeighborhood: draft.destinationNeighborhood,
          destinationComplement: draft.destinationComplement ?? "",
          destinationReference: draft.destinationReference ?? "",
          destinationCity: draft.destinationCity,
          destinationState: draft.destinationState,
          destinationPostalCode: draft.destinationPostalCode ?? "",
          offeredPrice: String(draft.offeredPrice).replace(".", ","),
          paymentMethod: draft.paymentMethod,
          notes: draft.notes ?? "",
        });
        setCoordinates({
          latitude: draft.destinationLatitude,
          longitude: draft.destinationLongitude,
        });
        setMapRecenterKey((current) => current + 1);
        programmaticSearchValue.current = `${draft.destinationAddress}, ${draft.destinationNumber} - ${draft.destinationNeighborhood}`;
        setAddressSearch(
          `${draft.destinationAddress}, ${draft.destinationNumber} - ${draft.destinationNeighborhood}`,
        );
        setApproximateAddress(
          `${draft.destinationAddress}, ${draft.destinationNumber} - ${draft.destinationNeighborhood}`,
        );
        setLocationResolved(true);
        setPinConfirmed(true);
        const repeatedLocation: CanonicalLocation = {
          formattedAddress: `${draft.destinationAddress}, ${draft.destinationNumber} - ${draft.destinationNeighborhood}`,
          latitude: draft.destinationLatitude,
          longitude: draft.destinationLongitude,
          source: "saved_location",
          components: {
            street: draft.destinationAddress,
            number: draft.destinationNumber,
            neighborhood: draft.destinationNeighborhood,
            city:
              draft.destinationCity === "PETROLINA_PE"
                ? "Petrolina"
                : "Juazeiro",
            state: draft.destinationState,
            postalCode: draft.destinationPostalCode ?? undefined,
          },
        };
        setSelectedLocation(repeatedLocation);
        setConfirmedLocation(repeatedLocation);
        setExtras(
          initialExtras.map((row) => {
            const copied = draft.extras?.find(
              (extra) => extra.type === row.type,
            );
            return copied
              ? {
                  type: row.type,
                  enabled: true,
                  description: copied.description,
                  amount:
                    copied.amount === null
                      ? ""
                      : String(copied.amount).replace(".", ","),
                  note: copied.note ?? "",
                }
              : row;
          }),
        );
        setMessage(
          "Rascunho preenchido. Revise endereço, PIN, valor e observações antes de publicar.",
        );
      } catch {
        if (active) setMessage("Erro de conexão ao carregar o rascunho.");
      } finally {
        if (active) setStatus("idle");
      }
    }
    void loadDraft();
    return () => {
      active = false;
    };
  }, [repeatDeliveryId]);

  function updateExtra(
    type: ExtraType,
    values: Partial<Omit<PlannedExtra, "type">>,
  ) {
    setExtras((current) =>
      current.map((extra) =>
        extra.type === type ? { ...extra, ...values } : extra,
      ),
    );
    setMessage("");
  }

  function update(key: keyof typeof form, value: string) {
    if (status === "publishing") return;
    setForm((current) => ({ ...current, [key]: value }));
    const locationField =
      key === "destinationAddress"
        ? "street"
        : key === "destinationNumber"
          ? "number"
          : key === "destinationNeighborhood"
            ? "neighborhood"
            : key === "destinationPostalCode"
              ? "postalCode"
              : key === "destinationComplement"
                ? "complement"
                : key === "destinationReference"
                  ? "reference"
                  : null;
    if (locationField && isLocationDefiningAddressField(locationField)) {
      geocodeController.current?.abort();
      reverseController.current?.abort();
      geocodeRequests.current.invalidate();
      reverseRequests.current.invalidate();
      setLocationResolved(false);
      setPinConfirmed(false);
      setSelectedLocation(null);
      setConfirmedLocation(null);
      setStatus("idle");
      setSuggestionStatus("idle");
      setLocationMessage("");
      quoteRequests.current.invalidate();
      setQuote(null);
      setQuoteError("");
    }
    setMessage("");
  }

  function chooseCity(city: City) {
    if (status === "publishing") return;
    setForm((current) => ({
      ...current,
      destinationCity: city,
      destinationState: city === "PETROLINA_PE" ? "PE" : "BA",
    }));
    geocodeController.current?.abort();
    reverseController.current?.abort();
    geocodeRequests.current.invalidate();
    reverseRequests.current.invalidate();
    setCoordinates(cityCenters[city]);
    setMapRecenterKey((current) => current + 1);
    setSuggestions([]);
    setLocationResolved(false);
    setPinConfirmed(false);
    setSelectedLocation(null);
    setConfirmedLocation(null);
    setStatus("idle");
    setSuggestionStatus("idle");
    setLocationMessage("");
    quoteRequests.current.invalidate();
    setQuote(null);
    setQuoteError("");
  }

  function applyDestinationLocation(
    result: AddressSuggestion,
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
        street: form.destinationAddress,
        number: form.destinationNumber,
        neighborhood: form.destinationNeighborhood,
        postalCode: form.destinationPostalCode,
        city: form.destinationCity,
      },
      location,
      options.preserveEnteredNumber,
    );
    const nextAddress = address.street;
    const nextNumber = address.number;
    const nextNeighborhood = address.neighborhood;
    const nextPostalCode = address.postalCode;
    const nextCity = address.city;
    setForm((current) => ({
      ...current,
      destinationAddress: nextAddress,
      destinationNumber: nextNumber,
      destinationNeighborhood: nextNeighborhood,
      destinationPostalCode: nextPostalCode,
      destinationCity: nextCity,
      destinationState: nextCity === "PETROLINA_PE" ? "PE" : "BA",
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
        state: nextCity === "PETROLINA_PE" ? "PE" : "BA",
      },
    };
    setSelectedLocation(complete ? synchronizedLocation : null);
    setConfirmedLocation(null);
    setLocationResolved(complete);
    return complete;
  }

  function chooseSuggestion(result: AddressSuggestion) {
    suggestionRequests.current.invalidate();
    geocodeRequests.current.invalidate();
    reverseRequests.current.invalidate();
    geocodeController.current?.abort();
    reverseController.current?.abort();
    const complete = applyDestinationLocation(result, "autocomplete", {
      preserveEnteredNumber: false,
    });
    setMapRecenterKey((current) => current + 1);
    setSuggestions([]);
    setPinConfirmed(false);
    setStatus("idle");
    setSuggestionStatus("idle");
    quoteRequests.current.invalidate();
    setQuote(null);
    setQuoteError("");
    setLocationMessage(
      complete
        ? "Endereço localizado. Confira o ponto no mapa e confirme o destino."
        : "Endereço aproximado. Informe o número e localize novamente.",
    );
    setMessage("");
  }

  async function resolveExactCoordinates(next: Coordinates) {
    const normalized = normalizeCoordinates(next);
    if (!normalized) {
      setMessage("As coordenadas informadas não são válidas.");
      return;
    }
    geocodeController.current?.abort();
    geocodeRequests.current.invalidate();
    reverseController.current?.abort();
    const controller = new AbortController();
    reverseController.current = controller;
    const requestId = reverseRequests.current.next();
    setCoordinates(normalized);
    setMapRecenterKey((current) => current + 1);
    setSuggestions([]);
    setLocationResolved(false);
    setPinConfirmed(false);
    setSelectedLocation(null);
    setConfirmedLocation(null);
    quoteRequests.current.invalidate();
    setQuote(null);
    setQuoteError("");
    setSuggestionStatus("searching");
    setStatus("idle");
    setApproximateAddress(
      `${normalized.latitude.toFixed(6)}, ${normalized.longitude.toFixed(6)}`,
    );
    setLocationMessage(
      "Coordenadas reconhecidas. Identificando o endereço do ponto…",
    );
    try {
      const response = await fetch("/api/maps/reverse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(normalized),
        signal: controller.signal,
      });
      const payload = (await response.json()) as {
        result?: AddressSuggestion | null;
      };
      if (!reverseRequests.current.isLatest(requestId)) return;
      if (response.ok && payload.result) {
        const complete = applyDestinationLocation(
          payload.result,
          "coordinates",
          { exactCoordinates: normalized },
        );
        setLocationMessage(
          complete
            ? "Ponto identificado. Confira o mapa e confirme o destino."
            : "Ponto preservado, mas o endereço está incompleto. Preencha os campos e localize novamente.",
        );
      } else {
        setLocationMessage(
          "O ponto foi marcado, mas não conseguimos identificar o endereço completo. Tente novamente.",
        );
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      if (!reverseRequests.current.isLatest(requestId)) return;
      setLocationMessage(
        "O ponto foi marcado, mas não foi possível consultar o endereço agora. Tente novamente.",
      );
    } finally {
      if (reverseRequests.current.isLatest(requestId))
        setSuggestionStatus("idle");
    }
  }

  function changeAddressSearch(value: string) {
    if (status === "publishing") return;
    programmaticSearchValue.current = null;
    suggestionRequests.current.invalidate();
    geocodeController.current?.abort();
    reverseController.current?.abort();
    geocodeRequests.current.invalidate();
    reverseRequests.current.invalidate();
    setAddressSearch(value);
    setSuggestions([]);
    setSuggestionStatus("idle");
    setStatus("idle");
    setLocationResolved(false);
    setPinConfirmed(false);
    setSelectedLocation(null);
    setConfirmedLocation(null);
    setLocationMessage("");
    quoteRequests.current.invalidate();
    setQuote(null);
    setQuoteError("");
    setMessage("");
    const exact = parseCoordinatesInput(value);
    if (exact) void resolveExactCoordinates(exact);
  }

  function hasRequiredAddress() {
    if (
      !form.destinationAddress.trim() ||
      !form.destinationNumber.trim() ||
      !form.destinationNeighborhood.trim()
    ) {
      setMessage("Preencha rua, número e bairro do destino.");
      return false;
    }
    return true;
  }

  async function locateDestination() {
    if (!hasRequiredAddress()) return;
    geocodeController.current?.abort();
    reverseController.current?.abort();
    reverseRequests.current.invalidate();
    const controller = new AbortController();
    geocodeController.current = controller;
    const requestId = geocodeRequests.current.next();
    setStatus("searching");
    setMessage("");
    setPinConfirmed(false);
    quoteRequests.current.invalidate();
    setQuote(null);
    setQuoteError("");
    try {
      const response = await fetch("/api/maps/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: form.destinationAddress,
          number: form.destinationNumber,
          neighborhood: form.destinationNeighborhood,
          city: form.destinationCity,
          state: form.destinationState,
          postalCode: form.destinationPostalCode,
        }),
        signal: controller.signal,
      });
      const payload = (await response.json()) as {
        error?: string;
        result?: AddressSuggestion;
      };
      if (!geocodeRequests.current.isLatest(requestId)) return;
      if (!response.ok || !payload.result) {
        setMessage(
          payload.error ?? "Destino não encontrado. Ajuste o PIN manualmente.",
        );
        return;
      }
      const complete = applyDestinationLocation(payload.result, "geocode", {
        preserveEnteredNumber: true,
      });
      setMapRecenterKey((current) => current + 1);
      setPinConfirmed(false);
      setLocationMessage(
        complete
          ? "Endereço localizado. Confira o ponto no mapa e confirme o destino."
          : "O endereço foi localizado de forma aproximada. Confira os campos e o PIN.",
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      if (!geocodeRequests.current.isLatest(requestId)) return;
      setMessage("Busca indisponível. Ajuste o PIN manualmente.");
    } finally {
      if (geocodeRequests.current.isLatest(requestId)) setStatus("idle");
    }
  }

  async function saveDestination() {
    if (!locationResolved || !selectedLocation) {
      await locateDestination();
      return;
    }
    if (!hasRequiredAddress()) return;
    setConfirmedLocation(selectedLocation);
    setPinConfirmed(true);
    setLocationMessage(
      "Destino confirmado. Distância e sugestão de valor serão atualizadas para este ponto.",
    );
    setMessage("");
  }

  async function handlePinChange(next: Coordinates) {
    if (status === "publishing") return;
    const normalized = normalizeCoordinates(next);
    if (!normalized) {
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
    setPinConfirmed(false);
    setSelectedLocation(null);
    setConfirmedLocation(null);
    quoteRequests.current.invalidate();
    setQuote(null);
    setQuoteError("");
    setSuggestionStatus("searching");
    setStatus("idle");
    setApproximateAddress(
      `${normalized.latitude.toFixed(6)}, ${normalized.longitude.toFixed(6)}`,
    );
    setLocationMessage("Identificando o endereço do ponto ajustado…");
    setMessage("");
    try {
      const response = await fetch("/api/maps/reverse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(normalized),
        signal: controller.signal,
      });
      const payload = (await response.json()) as {
        result?: AddressSuggestion | null;
      };
      if (!reverseRequests.current.isLatest(requestId)) return;
      if (!response.ok || !payload.result) {
        setLocationMessage(
          "O ponto foi marcado no mapa, mas não conseguimos identificar o endereço completo. Tente novamente.",
        );
        return;
      }
      const complete = applyDestinationLocation(payload.result, "pin", {
        exactCoordinates: normalized,
      });
      setLocationMessage(
        complete
          ? "Ponto ajustado no mapa. Confira os dados e confirme o destino."
          : "Ponto preservado. Complete o endereço e localize-o novamente antes de confirmar.",
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      if (!reverseRequests.current.isLatest(requestId)) return;
      setLocationMessage(
        "O ponto foi marcado no mapa, mas não foi possível consultar o endereço agora. Tente novamente.",
      );
    } finally {
      if (reverseRequests.current.isLatest(requestId))
        setSuggestionStatus("idle");
    }
  }

  async function publish(event: FormEvent) {
    event.preventDefault();
    if (!hasRequiredAddress()) return;
    if (!pinConfirmed || !confirmedLocation) {
      setMessage(
        "Localize o destino e confirme o PIN no mapa antes de publicar.",
      );
      return;
    }
    if (!coordinatesMatch(confirmedLocation, coordinates)) {
      setMessage(
        "O PIN mudou. Confirme novamente o destino antes de publicar.",
      );
      return;
    }
    const confirmedCoordinates = normalizeCoordinates(confirmedLocation);
    if (!confirmedCoordinates) {
      setMessage("As coordenadas do destino não são válidas.");
      return;
    }
    setStatus("publishing");
    setMessage("");
    try {
      const response = await fetch("/api/deliveries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          offeredPrice: Number(form.offeredPrice.replace(",", ".")),
          destinationLatitude: confirmedCoordinates.latitude,
          destinationLongitude: confirmedCoordinates.longitude,
          extras: extras
            .filter((extra) => extra.enabled)
            .map((extra) => ({
              type: extra.type,
              description: extra.description,
              ...(extra.amount
                ? { amount: Number(extra.amount.replace(",", ".")) }
                : {}),
              ...(extra.note ? { note: extra.note } : {}),
            })),
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setMessage(
          payload.error ?? "Não foi possível publicar a oportunidade.",
        );
        return;
      }
      router.push("/app/empresa/entregas");
      router.refresh();
    } catch {
      setMessage("Erro de rede ao publicar. Tente novamente.");
    } finally {
      setStatus("idle");
    }
  }

  return (
    <form onSubmit={publish} className="grid gap-6 xl:grid-cols-[1fr_.82fr]">
      <div className="space-y-6">
        {repeatSource && (
          <Card className="border-brand/25 bg-brand-light/35 p-5 text-sm">
            <p className="font-bold text-brand-dark">
              Rascunho baseado em uma entrega anterior
            </p>
            <p className="mt-2 text-muted">
              A coleta atual continua sendo o ponto padrão da empresa. Na
              entrega original era {repeatSource.pickupAddress},{" "}
              {repeatSource.pickupNumber} · {repeatSource.pickupNeighborhood}.
              Nada será publicado sem sua confirmação.
            </p>
          </Card>
        )}
        <Card className="p-5 sm:p-7">
          <p className="text-xs font-extrabold uppercase tracking-[.15em] text-brand">
            1 · Coleta
          </p>
          <h2 className="mt-2 font-display text-xl font-extrabold">
            {pickup.label}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            {pickup.address}, {pickup.number} · {pickup.neighborhood} —{" "}
            {pickup.state}
          </p>
          <p className="mt-3 text-xs text-muted">
            O ponto padrão confirmado foi carregado automaticamente.
          </p>
        </Card>

        <Card className="p-5 sm:p-7">
          <p className="text-xs font-extrabold uppercase tracking-[.15em] text-brand">
            Informações da entrega
          </p>
          <h2 className="mt-2 font-display text-xl font-extrabold">
            Condições especiais
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Informe apenas condições que o motoboy precisa conhecer antes de
            aceitar.
          </p>
          <div className="mt-5 space-y-4">
            {extras.map((extra) => (
              <div
                key={extra.type}
                className="rounded-2xl border border-line p-4"
              >
                <label className="flex cursor-pointer items-start gap-3 text-sm font-bold">
                  <input
                    type="checkbox"
                    className="mt-0.5 size-5 accent-brand"
                    checked={extra.enabled}
                    onChange={(event) =>
                      updateExtra(extra.type, { enabled: event.target.checked })
                    }
                  />
                  <span>{DELIVERY_EXTRA_TYPE_LABELS[extra.type]}</span>
                </label>
                {extra.enabled && (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <FormField
                      label="Descrição"
                      htmlFor={`extra-description-${extra.type}`}
                      required
                    >
                      <Input
                        id={`extra-description-${extra.type}`}
                        maxLength={240}
                        value={extra.description}
                        onChange={(event) =>
                          updateExtra(extra.type, {
                            description: event.target.value,
                          })
                        }
                      />
                    </FormField>
                    <FormField
                      label="Valor adicional informado"
                      htmlFor={`extra-amount-${extra.type}`}
                      hint="Opcional · pagamento direto"
                    >
                      <Input
                        id={`extra-amount-${extra.type}`}
                        inputMode="decimal"
                        placeholder="Ex.: 5,00"
                        value={extra.amount}
                        onChange={(event) =>
                          updateExtra(extra.type, {
                            amount: event.target.value,
                          })
                        }
                      />
                    </FormField>
                    <div className="sm:col-span-2">
                      <FormField
                        label="Observação do adicional"
                        htmlFor={`extra-note-${extra.type}`}
                        hint="Opcional"
                      >
                        <Input
                          id={`extra-note-${extra.type}`}
                          maxLength={300}
                          value={extra.note}
                          onChange={(event) =>
                            updateExtra(extra.type, {
                              note: event.target.value,
                            })
                          }
                        />
                      </FormField>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          <p className="mt-5 rounded-2xl bg-amber-50 p-4 text-xs leading-5 text-amber-900">
            {DELIVERY_EXTRAS_NOTICE}
          </p>
        </Card>

        <Card className="p-5 sm:p-7">
          <p className="text-xs font-extrabold uppercase tracking-[.15em] text-brand">
            2 · Destino
          </p>
          <div className="relative mt-5">
            <FormField
              label="Endereço de destino"
              htmlFor="destinationSearch"
              hint="Digite rua, número e bairro, ou cole latitude, longitude ou um link completo do Google Maps."
            >
              <Input
                id="destinationSearch"
                value={addressSearch}
                placeholder="Rua, número ou estabelecimento"
                autoComplete="off"
                aria-autocomplete="list"
                aria-controls="destination-suggestions"
                disabled={status === "publishing"}
                onChange={(event) => changeAddressSearch(event.target.value)}
              />
            </FormField>
            {suggestionStatus === "searching" && (
              <p className="mt-2 text-xs text-muted" role="status">
                Buscando endereços…
              </p>
            )}
            {suggestionStatus === "error" && (
              <p className="mt-2 text-xs text-amber-800" role="status">
                A busca automática está indisponível. Preencha os campos e
                ajuste o pin no mapa.
              </p>
            )}
            {suggestions.length > 0 && (
              <div
                id="destination-suggestions"
                role="listbox"
                className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-line bg-white p-2 shadow-soft"
              >
                {suggestions.map((suggestion) => (
                  <button
                    key={`${suggestion.latitude}:${suggestion.longitude}:${suggestion.formattedAddress ?? suggestion.displayName}`}
                    type="button"
                    role="option"
                    aria-selected="false"
                    className="flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left text-sm hover:bg-brand-light/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                    onClick={() => chooseSuggestion(suggestion)}
                  >
                    <Icon
                      name="map-pin"
                      className="mt-0.5 size-5 shrink-0 text-brand"
                    />
                    <span className="leading-5 text-ink-soft">
                      {suggestion.formattedAddress ?? suggestion.displayName}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <FormField
              label="CEP"
              htmlFor="destinationPostalCode"
              hint="Opcional"
            >
              <Input
                id="destinationPostalCode"
                inputMode="numeric"
                value={form.destinationPostalCode}
                onChange={(event) =>
                  update("destinationPostalCode", event.target.value)
                }
              />
            </FormField>
            <FormField label="Cidade" htmlFor="destinationCity" required>
              <Select
                id="destinationCity"
                value={form.destinationCity}
                onChange={(event) => chooseCity(event.target.value as City)}
              >
                <option value="PETROLINA_PE">Petrolina / PE</option>
                <option value="JUAZEIRO_BA">Juazeiro / BA</option>
              </Select>
            </FormField>
            <FormField label="Rua" htmlFor="destinationAddress" required>
              <Input
                id="destinationAddress"
                value={form.destinationAddress}
                onChange={(event) =>
                  update("destinationAddress", event.target.value)
                }
              />
            </FormField>
            <FormField label="Número" htmlFor="destinationNumber" required>
              <Input
                id="destinationNumber"
                value={form.destinationNumber}
                onChange={(event) =>
                  update("destinationNumber", event.target.value)
                }
              />
            </FormField>
            <FormField
              label="Bairro"
              htmlFor="destinationNeighborhood"
              required
            >
              <Input
                id="destinationNeighborhood"
                value={form.destinationNeighborhood}
                onChange={(event) =>
                  update("destinationNeighborhood", event.target.value)
                }
              />
            </FormField>
            <FormField
              label="Complemento / referência"
              htmlFor="destinationComplement"
              hint="Opcional"
            >
              <Input
                id="destinationComplement"
                placeholder="Ex.: Apt. 202, portão azul"
                value={form.destinationComplement}
                onChange={(event) =>
                  update("destinationComplement", event.target.value)
                }
              />
            </FormField>
            <div className="sm:col-span-2">
              <FormField
                label="Ponto de referência"
                htmlFor="destinationReference"
                hint="Opcional"
              >
                <Input
                  id="destinationReference"
                  value={form.destinationReference}
                  onChange={(event) =>
                    update("destinationReference", event.target.value)
                  }
                />
              </FormField>
            </div>
          </div>
          <Button
            type="button"
            className="mt-6 w-full sm:w-auto"
            variant="outline"
            onClick={locateDestination}
            disabled={status !== "idle"}
          >
            <Icon name="map" className="size-5" />
            {status === "searching"
              ? "Buscando destino..."
              : "Localizar no mapa"}
          </Button>
          {locationMessage && (
            <p
              className={
                locationResolved
                  ? "mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"
                  : "mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
              }
              role="status"
            >
              {locationMessage}
            </p>
          )}
        </Card>

        <Card className="overflow-hidden">
          <div className="p-5 sm:p-7">
            <h2 className="font-display text-xl font-extrabold">
              Confirme o destino no mapa
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Clique no mapa ou arraste o PIN até a entrada correta do destino.
            </p>
            {approximateAddress && (
              <p className="mt-3 text-xs text-muted">
                Endereço aproximado: {approximateAddress}
              </p>
            )}
          </div>
          <div className="h-[25rem] border-y border-line bg-[#f3eeee] sm:h-[30rem]">
            <CompanyLocationMapLoader
              coordinates={coordinates}
              onChange={handlePinChange}
              onTileError={() =>
                setMessage("Alguns blocos do mapa não carregaram.")
              }
              recenterKey={mapRecenterKey}
            />
          </div>
          <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
            <p className="text-xs leading-5 text-muted">
              Confira o ponto no mapa. Se necessário, arraste o PIN até a
              entrada correta.
            </p>
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
              {!locationResolved && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void handlePinChange(coordinates)}
                  disabled={suggestionStatus === "searching"}
                >
                  Tentar identificar o ponto
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                onClick={saveDestination}
                disabled={
                  status !== "idle" ||
                  suggestionStatus === "searching" ||
                  !locationResolved
                }
              >
                <Icon name="check" className="size-4" />
                {pinConfirmed ? "Destino confirmado" : "Confirmar destino"}
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <div className="space-y-6 xl:sticky xl:top-24 xl:self-start">
        <Card className="p-5 sm:p-7">
          <p className="text-xs font-extrabold uppercase tracking-[.15em] text-brand">
            3 · Valor e pagamento
          </p>
          <div className="mt-5 space-y-5">
            <FormField
              label="Valor oferecido"
              htmlFor="offeredPrice"
              required
              hint="O pagamento será feito diretamente ao motoboy."
            >
              <Input
                id="offeredPrice"
                inputMode="decimal"
                placeholder="Ex.: 18,00"
                value={form.offeredPrice}
                onChange={(event) => update("offeredPrice", event.target.value)}
              />
            </FormField>
            <div className="rounded-2xl border border-brand/20 bg-brand-light/35 p-4 text-sm">
              <p className="font-bold text-brand-dark">
                Sugestão Vapor Entregas
              </p>
              {quoteLoading ? (
                <p className="mt-2 text-muted">Calculando sugestão...</p>
              ) : quote?.suggestedPrice !== null && quote ? (
                <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-display text-xl font-extrabold">
                      R${" "}
                      {quote.suggestedPrice.toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      Referência configurável; você confirma o valor final.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      update(
                        "offeredPrice",
                        quote.suggestedPrice!.toFixed(2).replace(".", ","),
                      )
                    }
                  >
                    Usar sugestão
                  </Button>
                </div>
              ) : (
                <p className="mt-2 text-muted">
                  {quoteError ||
                    "Confirme o PIN para consultar a regra vigente."}
                </p>
              )}
            </div>
            <FormField
              label="Forma de pagamento"
              htmlFor="paymentMethod"
              required
            >
              <Select
                id="paymentMethod"
                value={form.paymentMethod}
                onChange={(event) => {
                  update("paymentMethod", event.target.value);
                  trackMetaCustomEvent("PaymentMethodSelected", {
                    method: event.target.value,
                  });
                }}
              >
                {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField
              label="Observações"
              htmlFor="notes"
              hint="Opcional · até 500 caracteres"
            >
              <textarea
                id="notes"
                maxLength={500}
                placeholder="Ex.: retornar com maquineta"
                className="min-h-28 w-full rounded-2xl border border-line bg-white p-4 text-sm text-ink shadow-sm focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10"
                value={form.notes}
                onChange={(event) => update("notes", event.target.value)}
              />
            </FormField>
          </div>
        </Card>

        <Card className="p-5 sm:p-7">
          <p className="text-xs font-extrabold uppercase tracking-[.15em] text-brand">
            Resumo antes de publicar
          </p>
          <h2 className="mt-3 font-display text-xl font-extrabold">
            {pickup.companyName}
          </h2>
          <dl className="mt-5 space-y-4 text-sm">
            <div>
              <dt className="font-bold text-muted">Coleta</dt>
              <dd className="mt-1 text-ink">{pickup.neighborhood}</dd>
            </div>
            <div>
              <dt className="font-bold text-muted">Destino</dt>
              <dd className="mt-1 text-ink">
                {form.destinationAddress
                  ? `${form.destinationAddress}, ${form.destinationNumber || "s/n"} · ${form.destinationNeighborhood || "bairro não informado"}`
                  : "Informe o endereço"}
              </dd>
              {form.destinationComplement && (
                <dd className="mt-1 text-xs text-muted">
                  {form.destinationComplement}
                </dd>
              )}
            </div>
            <div>
              <dt className="font-bold text-muted">Distância estimada</dt>
              <dd className="mt-1 text-ink">
                {pinConfirmed
                  ? `${(quote?.distanceEstimateKm ?? distance).toFixed(1).replace(".", ",")} km${quote?.routeDurationSeconds ? ` · ~${Math.max(1, Math.ceil(quote.routeDurationSeconds / 60))} min` : ""}`
                  : "Confirme o PIN"}
              </dd>
              {pinConfirmed && (
                <p className="mt-1 text-xs text-muted">
                  {quote?.distanceLabel ??
                    "Prévia geográfica; não representa distância viária."}
                </p>
              )}
            </div>
            <div>
              <dt className="font-bold text-muted">Valor sugerido</dt>
              <dd className="mt-1 text-ink">
                {quote?.suggestedPrice === null || !quote
                  ? "Regra indisponível"
                  : `R$ ${quote.suggestedPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
              </dd>
            </div>
            <div>
              <dt className="font-bold text-muted">Valor</dt>
              <dd className="mt-1 text-ink">
                {form.offeredPrice
                  ? `R$ ${form.offeredPrice}`
                  : "Informe o valor"}
              </dd>
            </div>
            <div>
              <dt className="font-bold text-muted">Pagamento</dt>
              <dd className="mt-1 text-ink">
                {PAYMENT_METHOD_LABELS[form.paymentMethod]}
              </dd>
            </div>
            <div>
              <dt className="font-bold text-muted">Adicionais</dt>
              <dd className="mt-1 text-ink">
                {extras.filter((extra) => extra.enabled).length || "Nenhum"}
              </dd>
            </div>
          </dl>
          <p className="mt-5 rounded-2xl bg-brand-light/60 p-4 text-xs leading-5 text-brand-dark">
            {DIRECT_PAYMENT_NOTICE}
          </p>
          {message && (
            <p className="mt-4 text-sm font-semibold text-red-700" role="alert">
              {message}
            </p>
          )}
          <Button
            type="submit"
            size="lg"
            className="mt-5 w-full"
            disabled={status !== "idle" || !form.offeredPrice || !pinConfirmed}
          >
            <Icon name="package" className="size-5" />
            {status === "publishing" ? "Publicando..." : "Publicar entrega"}
          </Button>
        </Card>
      </div>
    </form>
  );
}
