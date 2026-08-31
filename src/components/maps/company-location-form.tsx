"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { Icon } from "@/components/icons/icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { Coordinates } from "@/lib/maps/geo";

import { CompanyLocationMapLoader } from "./company-location-map-loader";

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

function cityName(city: City) {
  return city === "PETROLINA_PE" ? "Petrolina/PE" : "Juazeiro/BA";
}

export function CompanyLocationForm({
  initial,
}: {
  initial: InitialCompanyLocation;
}) {
  const [form, setForm] = useState(initial);
  const [coordinates, setCoordinates] = useState<Coordinates>(() =>
    initial.latitude !== null && initial.longitude !== null
      ? { latitude: initial.latitude, longitude: initial.longitude }
      : cityCenters[initial.city],
  );
  const [status, setStatus] = useState<
    "idle" | "searching" | "saving" | "saved" | "not-found" | "geocoding-error"
  >("idle");
  const [message, setMessage] = useState("");
  const [approximateAddress, setApproximateAddress] = useState("");
  const [pinWasAdjusted, setPinWasAdjusted] = useState(false);
  const [tileError, setTileError] = useState(false);
  const skipNextReverse = useRef(false);

  useEffect(() => {
    if (!pinWasAdjusted || skipNextReverse.current) {
      skipNextReverse.current = false;
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/maps/reverse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(coordinates),
          signal: controller.signal,
        });
        if (!response.ok) return;
        const payload = (await response.json()) as {
          result?: { displayName?: string } | null;
        };
        if (payload.result?.displayName)
          setApproximateAddress(payload.result.displayName);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setMessage(
            "Não foi possível identificar o endereço aproximado. O PIN ainda pode ser salvo.",
          );
        }
      }
    }, 800);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [coordinates, pinWasAdjusted]);

  function updateField<Key extends keyof InitialCompanyLocation>(
    key: Key,
    value: InitialCompanyLocation[Key],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
    if (status === "saved") setStatus("idle");
  }

  function chooseCity(city: City) {
    const state = city === "PETROLINA_PE" ? "PE" : "BA";
    setForm((current) => ({ ...current, city, state }));
    if (!pinWasAdjusted && initial.latitude === null)
      setCoordinates(cityCenters[city]);
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
    setStatus("searching");
    setMessage("");
    try {
      const response = await fetch("/api/maps/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = (await response.json()) as {
        error?: string;
        result?: { latitude: number; longitude: number; displayName: string };
      };
      if (!response.ok || !payload.result) {
        setStatus(response.status === 404 ? "not-found" : "geocoding-error");
        setMessage(payload.error ?? "Não foi possível buscar o endereço.");
        return;
      }
      skipNextReverse.current = true;
      setCoordinates(payload.result);
      setApproximateAddress(payload.result.displayName);
      setPinWasAdjusted(true);
      setStatus("idle");
    } catch {
      setStatus("geocoding-error");
      setMessage(
        "Busca indisponível. Você ainda pode posicionar o PIN manualmente.",
      );
    }
  }

  function adjustPin(next: Coordinates) {
    setCoordinates(next);
    setPinWasAdjusted(true);
    setStatus("idle");
    setMessage("");
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!validateAddress()) return;
    setStatus("saving");
    setMessage("");
    try {
      const response = await fetch("/api/company/location", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, ...coordinates }),
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
      setStatus("saved");
      setMessage("Localização salva como ponto padrão de coleta.");
    } catch {
      setStatus("idle");
      setMessage("Não foi possível salvar agora. Tente novamente.");
    }
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <Card className="p-5 sm:p-7">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-extrabold text-ink">
              Endereço de coleta
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              Informe onde o motoboy deverá retirar futuras entregas.
            </p>
          </div>
          {form.isDefault && <Badge variant="success">Ponto padrão</Badge>}
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label="Nome do local" htmlFor="label" required>
            <Input
              id="label"
              value={form.label}
              onChange={(event) => updateField("label", event.target.value)}
            />
          </FormField>
          <FormField label="CEP" htmlFor="postalCode" hint="Opcional">
            <Input
              id="postalCode"
              inputMode="numeric"
              maxLength={9}
              placeholder="56300-000"
              value={form.postalCode}
              onChange={(event) =>
                updateField("postalCode", event.target.value)
              }
            />
          </FormField>
          <FormField label="Rua" htmlFor="address" required>
            <Input
              id="address"
              autoComplete="street-address"
              value={form.address}
              onChange={(event) => updateField("address", event.target.value)}
            />
          </FormField>
          <FormField label="Número" htmlFor="number" required>
            <Input
              id="number"
              value={form.number}
              onChange={(event) => updateField("number", event.target.value)}
            />
          </FormField>
          <FormField label="Bairro" htmlFor="neighborhood" required>
            <Input
              id="neighborhood"
              value={form.neighborhood}
              onChange={(event) =>
                updateField("neighborhood", event.target.value)
              }
            />
          </FormField>
          <FormField label="Cidade" htmlFor="city" required>
            <Select
              id="city"
              value={form.city}
              onChange={(event) => chooseCity(event.target.value as City)}
            >
              <option value="PETROLINA_PE">Petrolina / PE</option>
              <option value="JUAZEIRO_BA">Juazeiro / BA</option>
            </Select>
          </FormField>
          <FormField label="Estado" htmlFor="state">
            <Input id="state" value={form.state} disabled />
          </FormField>
          <FormField label="Complemento" htmlFor="complement" hint="Opcional">
            <Input
              id="complement"
              value={form.complement}
              onChange={(event) =>
                updateField("complement", event.target.value)
              }
            />
          </FormField>
          <div className="sm:col-span-2">
            <FormField
              label="Ponto de referência"
              htmlFor="reference"
              hint="Opcional"
            >
              <Input
                id="reference"
                value={form.reference}
                onChange={(event) =>
                  updateField("reference", event.target.value)
                }
              />
            </FormField>
          </div>
        </div>
        <Button
          className="mt-6 w-full sm:w-auto"
          variant="outline"
          onClick={locateAddress}
          disabled={status === "searching" || status === "saving"}
        >
          <Icon name="map" className="size-5" />
          {status === "searching"
            ? "Buscando endereço..."
            : "Localizar endereço"}
        </Button>
      </Card>

      <Card className="overflow-hidden">
        <div className="p-5 sm:p-7">
          <p className="text-xs font-bold uppercase tracking-[.15em] text-brand">
            Confirmação no mapa
          </p>
          <h2 className="mt-2 font-display text-xl font-extrabold text-ink">
            Confirme a localização exata da sua empresa
          </h2>
          <p className="mt-2 text-sm font-semibold text-ink-soft">
            {form.address || "Rua"}, {form.number || "número"} ·{" "}
            {form.neighborhood || "bairro"} — {cityName(form.city)}
          </p>
          <div className="mt-4 flex gap-3 rounded-2xl bg-brand-light/60 p-4 text-sm leading-6 text-brand-dark">
            <Icon name="map" className="mt-0.5 size-5 shrink-0" />
            <p>
              Ajuste o marcador exatamente na entrada do estabelecimento. Clique
              no mapa ou arraste o PIN.
            </p>
          </div>
          {approximateAddress && (
            <p className="mt-4 text-xs leading-5 text-muted" aria-live="polite">
              <strong className="text-ink-soft">Endereço aproximado:</strong>{" "}
              {approximateAddress}
            </p>
          )}
          {tileError && (
            <p
              className="mt-4 rounded-2xl bg-amber-50 p-3 text-sm text-amber-800"
              role="status"
            >
              Alguns blocos do mapa não carregaram. Verifique sua conexão ou
              tente novamente.
            </p>
          )}
        </div>
        <div className="relative h-[26rem] min-h-[22rem] border-y border-line bg-[#f3eeee] sm:h-[32rem]">
          <CompanyLocationMapLoader
            coordinates={coordinates}
            onChange={adjustPin}
            onTileError={() => setTileError(true)}
          />
          {status === "searching" && (
            <div
              className="pointer-events-none absolute inset-x-4 top-4 z-[500] rounded-2xl bg-white/95 p-4 text-center text-sm font-bold text-ink shadow-card backdrop-blur"
              role="status"
            >
              Buscando o endereço no mapa…
            </div>
          )}
        </div>
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div aria-live="polite">
            {message && (
              <p
                className={
                  status === "saved"
                    ? "text-sm font-bold text-brand"
                    : "text-sm font-semibold text-red-700"
                }
                role="status"
              >
                {message}
              </p>
            )}
            {!message && (
              <p className="text-xs leading-5 text-muted">
                As coordenadas são privadas e não aparecem publicamente.
              </p>
            )}
          </div>
          <Button
            type="submit"
            size="lg"
            className="w-full shrink-0 sm:w-auto"
            disabled={status === "saving" || status === "searching"}
          >
            <Icon name="check" className="size-5" />
            {status === "saving" ? "Salvando..." : "Salvar localização"}
          </Button>
        </div>
      </Card>
    </form>
  );
}
