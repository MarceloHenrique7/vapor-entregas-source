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
  const needsRequiredAddress =
    !address.street.trim() ||
    !address.number.trim() ||
    !address.neighborhood.trim();
  const editingAddress =
    !locationResolved || needsRequiredAddress || manuallyEditingAddress;

  const messageStyle = {
    neutral: "text-muted",
    success: "text-emerald-800",
    warning: "text-amber-800",
    error: "text-red-700",
  }[messageTone];
  const summary = formattedAddress?.trim() || address.street.trim();

  return (
    <Card className="overflow-hidden">
      <div className="p-5 sm:p-7">
        {eyebrow && (
          <p className="text-xs font-extrabold uppercase tracking-[.15em] text-brand">
            {eyebrow}
          </p>
        )}
        <h2 className="mt-2 font-display text-xl font-extrabold text-ink">
          {title}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          {description}
        </p>
        <div className="relative mt-5">
          <FormField
            label="Buscar endereço"
            htmlFor={`${idPrefix}-search`}
            hint="Rua, número, CEP ou estabelecimento."
          >
            <Input
              id={`${idPrefix}-search`}
              value={searchValue}
              placeholder="Digite para buscar"
              autoComplete="off"
              aria-autocomplete="list"
              aria-controls={`${idPrefix}-suggestions`}
              disabled={disabled}
              onChange={(event) => onSearchChange(event.target.value)}
            />
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
              className="absolute z-[600] mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-line bg-white p-2 shadow-card"
            >
              {suggestions.map((suggestion) => (
                <button
                  key={`${suggestion.latitude}:${suggestion.longitude}:${suggestion.formattedAddress ?? suggestion.displayName}`}
                  type="button"
                  role="option"
                  aria-selected="false"
                  className="flex min-h-12 w-full items-start gap-3 rounded-xl px-3 py-3 text-left text-sm hover:bg-brand-light/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                  onClick={() => {
                    setManuallyEditingAddress(false);
                    onSelectSuggestion(suggestion);
                  }}
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
      </div>

      <div className="relative h-[20rem] min-h-[18rem] border-y border-line bg-[#f3eeee] sm:h-[27rem]">
        <CompanyLocationMapLoader
          coordinates={coordinates}
          onChange={(next) => {
            setManuallyEditingAddress(false);
            onPinChange(next);
          }}
          onTileError={() => setTileError(true)}
          recenterKey={recenterKey}
        />
        {identifying && (
          <div
            className="pointer-events-none absolute inset-x-4 top-4 z-[500] rounded-2xl bg-white/95 p-3 text-center text-sm font-bold text-ink shadow-card backdrop-blur"
            role="status"
          >
            Identificando endereço…
          </div>
        )}
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
            {locationResolved && !needsRequiredAddress && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setManuallyEditingAddress((current) => !current)}
                disabled={disabled}
                aria-expanded={editingAddress}
                aria-controls={`${idPrefix}-structured-address`}
              >
                {editingAddress ? "Ocultar campos" : "Editar endereço"}
              </Button>
            )}
          </div>
        </section>

        {(editingAddress || !locationResolved) && (
          <div
            id={`${idPrefix}-structured-address`}
            className="grid gap-4 rounded-2xl bg-canvas p-4 sm:grid-cols-2"
          >
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
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
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
      <FormField label="Número" htmlFor={`${idPrefix}-number`} required>
        <Input
          id={`${idPrefix}-number`}
          value={address.number}
          disabled={disabled}
          onChange={(event) => onAddressChange("number", event.target.value)}
        />
      </FormField>
      <FormField label="Bairro" htmlFor={`${idPrefix}-neighborhood`} required>
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
