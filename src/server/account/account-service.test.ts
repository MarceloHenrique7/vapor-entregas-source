import { randomBytes } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashPassword } from "@/server/auth/password";
import { encryptPrivateField } from "@/server/security/private-fields";
import {
  AccountActiveDeliveryError,
  AccountPasswordInvalidError,
} from "./errors";
import {
  changeOwnPassword,
  closeOwnAccount,
  exportOwnData,
  getOwnAccount,
  updateOwnAccount,
  type AccountRepository,
} from "./account-service";
import type { AccountExportRecord, AccountOverview } from "./types";

const userId = "523b1b2e-6fc8-46c3-aac5-da0143988cb8";
const actor = { userId, role: "MOTOBOY" } as const;
const key = randomBytes(32).toString("base64");

function createRepository() {
  const state = { passwordHash: "", blocking: false, closed: false };
  const repository: AccountRepository = {
    getOverview: vi.fn(
      async (id) =>
        ({
          id,
          name: "Maria Silva",
          email: "maria@example.com",
          phone: "+5587999999999",
          role: "MOTOBOY",
          status: "ACTIVE",
          city: "PETROLINA_PE",
          fantasyName: null,
          documentMasked: "CPF final 25",
          birthDate: "1995-05-20",
          vehiclePlate: "ABC1234",
          createdAt: "2026-08-27T12:00:00.000Z",
          legalAcceptances: [
            {
              documentType: "TERMS_OF_USE",
              documentVersion: "1.0",
              acceptedAt: "2026-08-27T12:00:00.000Z",
            },
          ],
        }) as AccountOverview,
    ),
    updateOverview: vi.fn(
      async (id, role, input) =>
        ({
          id,
          name: input.name,
          email: "maria@example.com",
          phone: input.phone,
          role,
          status: "ACTIVE",
          city: "PETROLINA_PE",
          fantasyName: null,
          documentMasked: "CPF final 25",
          birthDate: "1995-05-20",
          vehiclePlate: input.vehiclePlate ?? null,
          createdAt: "2026-08-27T12:00:00.000Z",
          legalAcceptances: [],
        }) as AccountOverview,
    ),
    getCredentials: vi.fn(async () => ({ passwordHash: state.passwordHash })),
    changePasswordAndRevokeSessions: vi.fn(async (_id, passwordHash) => {
      state.passwordHash = passwordHash;
    }),
    getExportRecord: vi.fn(
      async () =>
        ({
          account: {
            id: userId,
            name: "Maria Silva",
            email: "maria@example.com",
            phone: "+5587999999999",
            role: "MOTOBOY",
            status: "ACTIVE",
            createdAt: new Date("2026-08-27T12:00:00Z"),
            updatedAt: new Date("2026-08-27T12:00:00Z"),
          },
          motoboyProfile: {
            cpfEncrypted: encryptPrivateField("52998224725", key),
            rgEncrypted: encryptPrivateField("123456789", key),
            birthDate: new Date("1995-05-20T00:00:00Z"),
            city: "PETROLINA_PE",
            vehiclePlate: "ABC1234",
            isOnline: false,
            onlineSince: null,
            lastLocationAt: null,
            lastLatitude: null,
            lastLongitude: null,
          },
          companyProfile: null,
          deliveries: [{ id: "delivery-own", status: "COMPLETED" }],
          ratingsGiven: [],
          ratingsReceived: [],
          favorites: [],
          reportsCreated: [],
          reportsReceivedCount: 0,
          legalAcceptances: [
            { documentType: "TERMS_OF_USE", documentVersion: "1.0" },
          ],
        }) as AccountExportRecord,
    ),
    hasBlockingDelivery: vi.fn(async () => state.blocking),
    closeAndAnonymize: vi.fn(async () => {
      state.closed = true;
    }),
  };
  return { state, repository };
}

describe("conta e privacidade", () => {
  beforeEach(() => vi.clearAllMocks());

  it("consulta e altera somente os dados derivados da própria sessão", async () => {
    const { state, repository } = createRepository();
    state.passwordHash = await hashPassword("SenhaAtual123");
    expect((await getOwnAccount(actor, repository)).id).toBe(userId);
    await updateOwnAccount(
      actor,
      {
        name: "Maria Atualizada",
        phone: "87999999999",
        vehiclePlate: "abc 1d23",
        currentPassword: "SenhaAtual123",
      },
      repository,
    );
    expect(repository.updateOverview).toHaveBeenCalledWith(
      userId,
      "MOTOBOY",
      expect.objectContaining({
        name: "Maria Atualizada",
        vehiclePlate: "ABC1D23",
      }),
    );
  });

  it("não permite escolher outro motoboy ao editar a placa", async () => {
    const { state, repository } = createRepository();
    state.passwordHash = await hashPassword("SenhaAtual123");
    await expect(
      updateOwnAccount(
        actor,
        {
          userId: "00000000-0000-4000-8000-000000000000",
          name: "Maria Silva",
          phone: "87999999999",
          vehiclePlate: "ABC1D23",
          currentPassword: "SenhaAtual123",
        },
        repository,
      ),
    ).rejects.toThrow();
    expect(repository.updateOverview).not.toHaveBeenCalled();
  });

  it("exporta dados próprios sem hashes, tokens ou secrets e rejeita ID de terceiro", async () => {
    const { state, repository } = createRepository();
    state.passwordHash = await hashPassword("SenhaAtual123");
    const exported = await exportOwnData(
      actor,
      { currentPassword: "SenhaAtual123" },
      repository,
      key,
    );
    const serialized = JSON.stringify(exported);
    expect(serialized).toContain("52998224725");
    expect(exported.profile).toMatchObject({ vehiclePlate: "ABC1234" });
    expect(serialized).not.toMatch(
      /passwordHash|tokenHash|FIELD_ENCRYPTION_KEY|session/i,
    );
    await expect(
      exportOwnData(
        actor,
        { currentPassword: "SenhaAtual123", userId: "outro" },
        repository,
        key,
      ),
    ).rejects.toThrow();
    expect(repository.getExportRecord).toHaveBeenCalledWith(userId, "MOTOBOY");
  });

  it("troca de senha exige senha atual e persiste novo Argon2id revogando sessões", async () => {
    const { state, repository } = createRepository();
    state.passwordHash = await hashPassword("SenhaAtual123");
    await expect(
      changeOwnPassword(
        actor,
        {
          currentPassword: "Errada123456",
          newPassword: "NovaSenhaForte123",
          passwordConfirmation: "NovaSenhaForte123",
        },
        repository,
      ),
    ).rejects.toBeInstanceOf(AccountPasswordInvalidError);
    await changeOwnPassword(
      actor,
      {
        currentPassword: "SenhaAtual123",
        newPassword: "NovaSenhaForte123",
        passwordConfirmation: "NovaSenhaForte123",
      },
      repository,
    );
    expect(state.passwordHash).toMatch(/^\$argon2id\$/);
    expect(repository.changePasswordAndRevokeSessions).toHaveBeenCalledWith(
      userId,
      expect.any(String),
      expect.any(Date),
    );
  });

  it("encerramento exige confirmação forte e bloqueia entrega operacional", async () => {
    const { state, repository } = createRepository();
    state.passwordHash = await hashPassword("SenhaAtual123");
    await expect(
      closeOwnAccount(
        actor,
        { currentPassword: "SenhaAtual123", confirmation: "SIM" },
        repository,
        key,
      ),
    ).rejects.toThrow();
    state.blocking = true;
    await expect(
      closeOwnAccount(
        actor,
        {
          currentPassword: "SenhaAtual123",
          confirmation: "ENCERRAR MINHA CONTA",
        },
        repository,
        key,
      ),
    ).rejects.toBeInstanceOf(AccountActiveDeliveryError);
    expect(repository.closeAndAnonymize).not.toHaveBeenCalled();
  });

  it("encerra e anonimiza a conta quando não há operação pendente", async () => {
    const { state, repository } = createRepository();
    state.passwordHash = await hashPassword("SenhaAtual123");
    await closeOwnAccount(
      actor,
      {
        currentPassword: "SenhaAtual123",
        confirmation: "ENCERRAR MINHA CONTA",
      },
      repository,
      key,
    );
    expect(state.closed).toBe(true);
    expect(repository.closeAndAnonymize).toHaveBeenCalledWith(
      userId,
      "MOTOBOY",
      expect.objectContaining({
        name: "Conta encerrada",
        passwordHash: expect.stringMatching(/^\$argon2id\$/),
      }),
      expect.any(Date),
    );
  });
});
