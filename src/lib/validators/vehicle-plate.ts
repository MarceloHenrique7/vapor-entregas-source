import { z } from "zod";

const BRAZILIAN_VEHICLE_PLATE = /^(?:[A-Z]{3}\d{4}|[A-Z]{3}\d[A-Z]\d{2})$/;

export const VEHICLE_PLATE_ERROR =
  "Informe uma placa válida, como ABC1234 ou ABC1D23.";

export function normalizeVehiclePlate(value: string): string {
  return value.toUpperCase().replace(/[\s-]+/g, "");
}

export function isValidBrazilianVehiclePlate(value: string): boolean {
  return BRAZILIAN_VEHICLE_PLATE.test(normalizeVehiclePlate(value));
}

const normalizedVehiclePlateSchema = z
  .string()
  .transform(normalizeVehiclePlate)
  .refine(
    (value) => value === "" || isValidBrazilianVehiclePlate(value),
    VEHICLE_PLATE_ERROR,
  );

export const optionalVehiclePlateSchema = normalizedVehiclePlateSchema
  .transform((value) => value || undefined)
  .optional();

export const editableVehiclePlateSchema = normalizedVehiclePlateSchema
  .transform((value) => value || null)
  .optional();
