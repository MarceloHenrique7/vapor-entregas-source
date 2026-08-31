import { describe, expect, it, vi } from "vitest";

import { ForbiddenError } from "@/server/auth/errors";

import {
  createOrReplaceDefaultCompanyLocation,
  getDefaultCompanyLocation,
  type LocationRepository,
  updateCompanyLocation,
} from "./location-service";
import type { CompanyLocationRecord } from "./types";

const companyUserId = "c4e534d4-5d2b-4d72-b0c8-a03cf7cd948f";
const anotherUserId = "5d6a7d9a-1f13-481f-aa8e-6a0b98a08ed1";
const companyId = "b315afec-cf15-4f70-9a20-00be53acd302";
const anotherCompanyId = "6f80cc9a-dc14-4fc9-b106-154a37a023f4";
const locationId = "cdb62aa3-3caf-4ef5-bf3b-d1c67d63dcbc";

const validInput = {
  label: "Loja principal",
  address: "Avenida Guararapes",
  number: "120",
  neighborhood: "Centro",
  complement: "Sala 2",
  reference: "Próximo à praça",
  city: "PETROLINA_PE" as const,
  state: "PE" as const,
  postalCode: "56302000",
  latitude: -9.3891,
  longitude: -40.5031,
};

const savedLocation: CompanyLocationRecord = {
  id: locationId,
  companyId,
  ...validInput,
  isDefault: true,
};

function repository(
  overrides: Partial<LocationRepository> = {},
): LocationRepository {
  return {
    getCompanyIdForUser: vi.fn().mockResolvedValue(companyId),
    getLocationOwnership: vi
      .fn()
      .mockResolvedValue({ companyId, userId: companyUserId }),
    saveDefault: vi.fn().mockResolvedValue(savedLocation),
    update: vi.fn().mockResolvedValue(savedLocation),
    getDefault: vi.fn().mockResolvedValue(savedLocation),
    ...overrides,
  };
}

describe("localização da empresa", () => {
  it("permite que a empresa crie seu ponto padrão", async () => {
    const repo = repository();
    await expect(
      createOrReplaceDefaultCompanyLocation(
        { userId: companyUserId, role: "COMPANY" },
        validInput,
        repo,
      ),
    ).resolves.toEqual(savedLocation);
    expect(repo.saveDefault).toHaveBeenCalledWith(companyId, validInput);
  });

  it("permite que a empresa atualize sua própria localização", async () => {
    const repo = repository();
    await expect(
      updateCompanyLocation(
        { userId: companyUserId, role: "COMPANY" },
        locationId,
        validInput,
        repo,
      ),
    ).resolves.toEqual(savedLocation);
    expect(repo.update).toHaveBeenCalledWith(locationId, validInput);
  });

  it("impede que a empresa edite a localização de outra empresa", async () => {
    const repo = repository({
      getLocationOwnership: vi.fn().mockResolvedValue({
        companyId: anotherCompanyId,
        userId: anotherUserId,
      }),
    });
    await expect(
      updateCompanyLocation(
        { userId: companyUserId, role: "COMPANY" },
        locationId,
        validInput,
        repo,
      ),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("permite que um administrador autorizado edite a localização", async () => {
    const repo = repository({
      getLocationOwnership: vi.fn().mockResolvedValue({
        companyId: anotherCompanyId,
        userId: anotherUserId,
      }),
    });
    await expect(
      updateCompanyLocation(
        { userId: companyUserId, role: "ADMIN" },
        locationId,
        validInput,
        repo,
      ),
    ).resolves.toEqual(savedLocation);
    expect(repo.update).toHaveBeenCalledWith(locationId, validInput);
  });

  it("impede que motoboy crie ou edite localização de empresa", async () => {
    const repo = repository();
    await expect(
      createOrReplaceDefaultCompanyLocation(
        { userId: anotherUserId, role: "MOTOBOY" },
        validInput,
        repo,
      ),
    ).rejects.toBeInstanceOf(ForbiddenError);
    await expect(
      updateCompanyLocation(
        { userId: anotherUserId, role: "MOTOBOY" },
        locationId,
        validInput,
        repo,
      ),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("rejeita latitude fora do intervalo válido", async () => {
    await expect(
      createOrReplaceDefaultCompanyLocation(
        { userId: companyUserId, role: "COMPANY" },
        { ...validInput, latitude: 90.01 },
        repository(),
      ),
    ).rejects.toThrow();
  });

  it("rejeita longitude fora do intervalo válido", async () => {
    await expect(
      createOrReplaceDefaultCompanyLocation(
        { userId: companyUserId, role: "COMPANY" },
        { ...validInput, longitude: -180.01 },
        repository(),
      ),
    ).rejects.toThrow();
  });

  it("recupera corretamente a localização padrão", async () => {
    const repo = repository();
    await expect(getDefaultCompanyLocation(companyId, repo)).resolves.toEqual(
      savedLocation,
    );
    expect(repo.getDefault).toHaveBeenCalledWith(companyId);
  });
});
