"use client";

import { useState, type ReactNode } from "react";

import { Icon } from "@/components/icons/icon";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { Coordinates } from "@/lib/maps/geo";
import type { GeocodingResultPayload } from "@/lib/maps/location";

import { CompanyLocationMapLoader } from "./company-location-map-loader";

export type LocationPickerCity = "PETROLINA_PE" | "JUAZEIRO_BA";

export interface LocationPickerAddress {
  street: string;
  number: string;
  neighborhood: string;
  postalCode: string;
  city: LocationPickerCity;
  state: "PE" | "BA";
  complement: string;
  reference: string;
}

export type LocationPickerAddressField = Exclude<
  keyof LocationPickerAddress,
  "city" | "state"
>;

function cityLabel(city: LocationPickerCity) {
  return city === "PETROLINA_PE" ? "Petrolina - PE" : "Juazeiro - BA";
}

export function AddressLocationPicker({
  idPrefix,
  eyebrow,
  title,
  description,
  searchValue,
  onSearchChange,
  suggestions,
  suggestionStatus,
  onSelectSuggestion,
  address,
  onAddressChange,
  onCityChange,
  onLocate,
  coordinates,
  onPinChange,
  recenterKey,
  locationResolved,
  confirmed = false,
  formattedAddress,
  message,
  messageTone = "neutral",
  identifying = false,
  disabled = false,
  primaryLabel,
  primaryDoneLabel,
  primaryLoadingLabel = "Salvando...",
  primaryLoading = false,
  primaryDisabled = false,
  onPrimaryAction,
  onRetry,
  extraControl,
}: {
  idPrefix: string;
  eyebrow?: string;
  title: string;
  description: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  suggestions: GeocodingResultPayload[];
  suggestionStatus: "idle" | "searching" | "error";
  onSelectSuggestion: (suggestion: GeocodingResultPayload) => void;
  address: LocationPickerAddress;
  onAddressChange: (field: LocationPickerAddressField, value: string) => void;
  onCityChange: (city: LocationPickerCity) => void;
  onLocate: () => void;
  coordinates: Coordinates;
  onPinChange: (coordinates: Coordinates) => void;
  recenterKey: number;
  locationResolved: boolean;
  confirmed?: boolean;
  formattedAddress?: string;
  message?: string;
  messageTone?: "neutral" | "success" | "warning" | "error";
  identifying?: boolean;
  disabled?: boolean;
  primaryLabel: string;
  primaryDoneLabel?: string;
  primaryLoadingLabel?: string;
  primaryLoading?: boolean;
  primaryDisabled?: boolean;
  onPrimaryAction: () => void;
  onRetry?: () => void;
  extraControl?: ReactNode;
}) {
  const [manuallyEditingAddress, setManuallyEditingAddress] = useState(false);
  const [tileError, setTileError] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const needsRequiredAddress =
    !address.street.trim() ||
    !address.number.trim() ||
    !address.neighborhood.trim();
  const editingAddress =
    manuallyEditingAddress || (locationResolved && needsRequiredAddress);

  const messageStyle = {
    neutral: "text-muted",
    success: "text-emerald-800",
    warning: "text-amber-800",
    error: "text-red-700",
  }[messageTone];
  const summary = formattedAddress?.trim() || address.street.trim();
  const safeActiveSuggestionIndex =
    activeSuggestionIndex >= 0 && activeSuggestionIndex < suggestions.length
      ? activeSuggestionIndex
      : -1;

  function selectSuggestionAt(index: number) {
    const suggestion = suggestions[index];
    if (!suggestion) return;
    setManuallyEditingAddress(false);
    setActiveSuggestionIndex(-1);
    onSelectSuggestion(suggestion);
  }

  return (
    <Card className="overflow-hidden">
      <div className="p-5 sm:p-7">
        {eyebrow && (
          <p className="text-xs font-extrabold uppercase tracking-[.15em] text-brand">
            {eyebrow}
          </p>
        )}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[.12em] text-brand">
              1 · Encontrar endereço
            </p>
            <h2 className="mt-2 font-display text-xl font-extrabold text-ink">
              {title}
            </h2>
          </div>
          <span className="rounded-full bg-brand-light px-3 py-1 text-xs font-bold text-brand-dark">
            Busca rápida
          </span>
        </div>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          {description} Depois, confirme o ponto exato no mapa.
        </p>
        <div className="relative mt-5">
          <FormField
            label="Digite rua, número, bairro ou CEP"
            htmlFor={`${idPrefix}-search`}
            hint="Você também pode pesquisar pelo nome de um estabelecimento."
          >
            <Input
              id={`${idPrefix}-search`}
              value={searchValue}
              placeholder="Rua, número, bairro ou CEP"
              autoComplete="off"
              aria-autocomplete="list"
              aria-expanded={suggestions.length > 0}
              aria-controls={`${idPrefix}-suggestions`}
              aria-activedescendant={
                safeActiveSuggestionIndex >= 0
                  ? `${idPrefix}-suggestion-${safeActiveSuggestionIndex}`
                  : undefined
              }
              disabled={disabled}
              onChange={(event) => {
                setActiveSuggestionIndex(-1);
                onSearchChange(event.target.value);
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown" && suggestions.length > 0) {
                  event.preventDefault();
                  setActiveSuggestionIndex((current) =>
                    current >= suggestions.length - 1 ? 0 : current + 1,
                  );
                  return;
                }
                if (event.key === "ArrowUp" && suggestions.length > 0) {
                  event.preventDefault();
                  setActiveSuggestionIndex((current) =>
                    current <= 0 ? suggestions.length - 1 : current - 1,
                  );
                  return;
                }
                if (event.key === "Escape") {
                  setActiveSuggestionIndex(-1);
                  return;
                }
                if (event.key !== "Enter") return;
                event.preventDefault();
                if (suggestions.length === 0) {
                  onLocate();
                  return;
                }
                selectSuggestionAt(
                  safeActiveSuggestionIndex >= 0
                    ? safeActiveSuggestionIndex
                    : 0,
                );
              }}
            />
            <Button
              type="button"
              variant="outline"
              className="mt-3 w-full"
              onClick={onLocate}
              disabled={disabled || identifying || !searchValue.trim()}
            >
              <Icon name="search" className="size-5" />
              Buscar endereço
            </Button>
          </FormField>
          {suggestionStatus === "searching" && (
            <p className="mt-2 text-xs text-muted" role="status">
              Buscando endereços…
            </p>
          )}
          {suggestionStatus === "error" && (
            <p className="mt-2 text-xs text-amber-800" role="status">
              A busca automática está indisponível. Ajuste o endereço ou o PIN.
            </p>
          )}
          {suggestions.length > 0 && (
            <div
              id={`${idPrefix}-suggestions`}
              role="listbox"
              className="absolute z-[600] mt-2 max-h-80 w-full overflow-y-auto rounded-2xl border border-line bg-white p-2 shadow-[0_18px_45px_rgba(33,24,25,.16)]"
            >
              {suggestions.map((suggestion, index) => {
                const components = suggestion.components ?? {};
                const primary = [components.street, components.number]
                  .filter(Boolean)
                  .join(", ");
                const secondary = [
                  components.neighborhood,
                  components.city,
                  components.state,
                  components.postalCode,
                ]
                  .filter(Boolean)
                  .join(" · ");
                const title =
                  primary ||
                  suggestion.formattedAddress ||
                  suggestion.displayName ||
                  "Local encontrado";
                const isActive = index === safeActiveSuggestionIndex;

                return (
                  <button
                    key={`${suggestion.latitude}:${suggestion.longitude}:${suggestion.formattedAddress ?? suggestion.displayName}`}
                    id={`${idPrefix}-suggestion-${index}`}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    className={`flex min-h-14 w-full items-start gap-3 rounded-xl px-3 py-3 text-left text-sm transition hover:bg-brand-light/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${isActive ? "bg-brand-light/45" : ""}`}
                    onMouseEnter={() => setActiveSuggestionIndex(index)}
                    onClick={() => selectSuggestionAt(index)}
                  >
                    <Icon
                      name="map-pin"
                      className="mt-0.5 size-5 shrink-0 text-brand"
                    />
                    <span className="min-w-0 leading-5">
                      <span className="block truncate font-bold text-ink">
                        {title}
                      </span>
                      <span className="block truncate text-xs text-muted">
                        {secondary ||
                          suggestion.formattedAddress ||
                          suggestion.displayName}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="border-y border-line bg-[#f3eeee]">
        <div className="border-b border-line bg-white px-5 py-4 sm:px-7">
          <p className="text-xs font-extrabold uppercase tracking-[.12em] text-brand">
            2 · Confirmar PIN
          </p>
          <p className="mt-1 text-sm font-semibold text-ink">
            Confirme a localização exata da entrada
          </p>
          <p className="mt-1 text-xs leading-5 text-muted">
            Toque no mapa ou arraste o PIN. Se a busca falhar, você pode marcar
            o ponto manualmente.
          </p>
        </div>
        <div className="relative h-[23rem] min-h-[21rem] sm:h-[30rem]">
          <CompanyLocationMapLoader
            coordinates={coordinates}
            onChange={(next) => {
              setManuallyEditingAddress(false);
              onPinChange(next);
            }}
            onTileError={() => setTileError(true)}
            recenterKey={recenterKey}
          />
          <div className="pointer-events-none absolute inset-x-4 bottom-4 z-[500] flex justify-center">
            <p className="rounded-full bg-white/95 px-4 py-2 text-center text-xs font-bold text-ink shadow-card backdrop-blur">
              arraste o PIN até a entrada do local
            </p>
          </div>
          {identifying && (
            <div
              className="pointer-events-none absolute inset-x-4 top-4 z-[500] rounded-2xl bg-white/95 p-3 text-center text-sm font-bold text-ink shadow-card backdrop-blur"
              role="status"
            >
              Identificando endereço…
            </div>
          )}
        </div>
      </div>

      <div className="space-y-5 p-5 sm:p-7">
        <section
          className={`rounded-2xl border p-4 ${
            locationResolved
              ? "border-emerald-200 bg-emerald-50"
              : "border-amber-200 bg-amber-50"
          }`}
          aria-live="polite"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-extrabold uppercase tracking-[.12em] text-muted">
                {locationResolved ? "Local identificado" : "Local a confirmar"}
              </p>
              <p className="mt-2 break-words text-sm font-bold text-ink">
                {summary || "Pesquise um endereço ou mova o PIN no mapa."}
              </p>
              {(address.neighborhood || address.city) && (
                <p className="mt-1 text-xs text-muted">
                  {[address.neighborhood, cityLabel(address.city)]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setManuallyEditingAddress((current) => !current)}
              disabled={disabled}
              aria-expanded={editingAddress}
              aria-controls={`${idPrefix}-structured-address`}
            >
              {editingAddress ? "Ocultar detalhes" : "Editar detalhes"}
            </Button>
          </div>
        </section>

        {editingAddress && (
          <div
            id={`${idPrefix}-structured-address`}
            className="grid gap-4 rounded-2xl bg-canvas p-4 sm:grid-cols-2"
          >
            <div className="sm:col-span-2">
              <p className="text-xs font-extrabold uppercase tracking-[.12em] text-brand">
                3 · Detalhes do endereço
              </p>
              <p className="mt-1 text-xs leading-5 text-muted">
                Confira os dados preenchidos automaticamente ou complete o que
                estiver faltando.
              </p>
            </div>
            {extraControl}
            <AddressFields
              idPrefix={idPrefix}
              address={address}
              disabled={disabled}
              onAddressChange={onAddressChange}
              onCityChange={onCityChange}
            />
            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  setManuallyEditingAddress(false);
                  onLocate();
                }}
                disabled={disabled || identifying}
              >
                <Icon name="map" className="size-5" />
                Localizar no mapa
              </Button>
            </div>
            <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
              <FormField
                label="Complemento"
                htmlFor={`${idPrefix}-complement`}
                hint="Opcional"
              >
                <Input
                  id={`${idPrefix}-complement`}
                  placeholder="Apto., bloco, sala ou portão"
                  value={address.complement}
                  disabled={disabled}
                  onChange={(event) =>
                    onAddressChange("complement", event.target.value)
                  }
                />
              </FormField>
              <FormField
                label="Referência"
                htmlFor={`${idPrefix}-reference`}
                hint="Opcional"
              >
                <Input
                  id={`${idPrefix}-reference`}
                  placeholder="Ex.: ao lado da farmácia"
                  value={address.reference}
                  disabled={disabled}
                  onChange={(event) =>
                    onAddressChange("reference", event.target.value)
                  }
                />
              </FormField>
            </div>
          </div>
        )}

        {tileError && (
          <p className="text-sm font-semibold text-amber-800" role="status">
            Alguns blocos do mapa não carregaram. Verifique a conexão.
          </p>
        )}
        {message && (
          <p className={`text-sm font-semibold ${messageStyle}`} role="status">
            {message}
          </p>
        )}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-muted">
            Endereço e PIN serão salvos como uma única localização.
          </p>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            {onRetry && !locationResolved && (
              <Button
                type="button"
                variant="outline"
                onClick={onRetry}
                disabled={disabled || identifying}
              >
                Tentar novamente
              </Button>
            )}
            <Button
              type="button"
              size="lg"
              className="w-full sm:w-auto"
              disabled={disabled || primaryDisabled}
              onClick={onPrimaryAction}
            >
              <Icon name="check" className="size-5" />
              {primaryLoading
                ? primaryLoadingLabel
                : confirmed && primaryDoneLabel
                  ? primaryDoneLabel
                  : primaryLabel}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function AddressFields({
  idPrefix,
  address,
  disabled,
  onAddressChange,
  onCityChange,
}: {
  idPrefix: string;
  address: LocationPickerAddress;
  disabled: boolean;
  onAddressChange: (field: LocationPickerAddressField, value: string) => void;
  onCityChange: (city: LocationPickerCity) => void;
}) {
  return (
    <>
      <FormField label="Rua" htmlFor={`${idPrefix}-street`} required>
        <Input
          id={`${idPrefix}-street`}
          value={address.street}
          disabled={disabled}
          onChange={(event) => onAddressChange("street", event.target.value)}
        />
      </FormField>
      <FormField
        label="Número"
        htmlFor={`${idPrefix}-number`}
        hint="Preenchido automaticamente quando disponível"
      >
        <Input
          id={`${idPrefix}-number`}
          placeholder="s/n"
          value={address.number}
          disabled={disabled}
          onChange={(event) => onAddressChange("number", event.target.value)}
        />
      </FormField>
      <FormField label="Bairro" htmlFor={`${idPrefix}-neighborhood`}>
        <Input
          id={`${idPrefix}-neighborhood`}
          value={address.neighborhood}
          disabled={disabled}
          onChange={(event) =>
            onAddressChange("neighborhood", event.target.value)
          }
        />
      </FormField>
      <FormField label="CEP" htmlFor={`${idPrefix}-postal-code`}>
        <Input
          id={`${idPrefix}-postal-code`}
          inputMode="numeric"
          maxLength={9}
          value={address.postalCode}
          disabled={disabled}
          onChange={(event) =>
            onAddressChange("postalCode", event.target.value)
          }
        />
      </FormField>
      <FormField label="Cidade" htmlFor={`${idPrefix}-city`} required>
        <Select
          id={`${idPrefix}-city`}
          value={address.city}
          disabled={disabled}
          onChange={(event) =>
            onCityChange(event.target.value as LocationPickerCity)
          }
        >
          <option value="PETROLINA_PE">Petrolina / PE</option>
          <option value="JUAZEIRO_BA">Juazeiro / BA</option>
        </Select>
      </FormField>
    </>
  );
}
