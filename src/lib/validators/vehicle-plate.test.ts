import { describe, expect, it } from "vitest";

import {
  isValidBrazilianVehiclePlate,
  normalizeVehiclePlate,
  editableVehiclePlateSchema,
  optionalVehiclePlateSchema,
} from "./vehicle-plate";

describe("placa brasileira de veículo", () => {
  it.each(["ABC1234", "ABC1D23"])("aceita o formato %s", (value) => {
    expect(isValidBrazilianVehiclePlate(value)).toBe(true);
    expect(optionalVehiclePlateSchema.parse(value)).toBe(value);
  });

  it.each([
    ["abc-1234", "ABC1234"],
    ["abc 1d23", "ABC1D23"],
  ])("normaliza %s para %s", (value, expected) => {
    expect(normalizeVehiclePlate(value)).toBe(expected);
    expect(optionalVehiclePlateSchema.parse(value)).toBe(expected);
  });

  it.each(["AB12345", "ABC@123"])("rejeita a placa inválida %s", (value) => {
    expect(optionalVehiclePlateSchema.safeParse(value).success).toBe(false);
  });

  it("permite campo vazio ou ausente", () => {
    expect(optionalVehiclePlateSchema.parse("")).toBeUndefined();
    expect(optionalVehiclePlateSchema.parse(undefined)).toBeUndefined();
    expect(editableVehiclePlateSchema.parse("")).toBeNull();
    expect(editableVehiclePlateSchema.parse(undefined)).toBeUndefined();
  });
});
