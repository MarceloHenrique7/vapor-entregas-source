import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  authenticateCredentials,
  type AuthRepository,
  type CredentialUserRecord,
} from "./authenticate";
import { InvalidCredentialsError } from "./errors";
import { hashPassword } from "./password";

function createRepository(user: CredentialUserRecord | null): AuthRepository {
  return {
    findUserByEmail: vi.fn().mockResolvedValue(user),
    recordFailedLogin: vi.fn().mockResolvedValue(undefined),
    recordSuccessfulLogin: vi.fn().mockResolvedValue(undefined),
  };
}

describe("authenticateCredentials", () => {
  let activeUser: CredentialUserRecord;

  beforeEach(async () => {
    activeUser = {
      id: "2c8c105d-7e31-4f9b-b1e1-3f74b4e66c97",
      name: "Admin Vapor Entregas",
      email: "admin@vapor-entregas.local",
      role: "ADMIN",
      status: "ACTIVE",
      passwordHash: await hashPassword("SenhaSegura123"),
      failedLoginAttempts: 0,
      lockedUntil: null,
    };
  });

  it("autentica credenciais válidas sem expor o hash", async () => {
    const repository = createRepository(activeUser);
    const user = await authenticateCredentials(
      {
        email: "ADMIN@VAPOR-ENTREGAS.LOCAL",
        password: "SenhaSegura123",
      },
      repository,
      new Date("2026-08-27T12:00:00.000Z"),
    );

    expect(user).toEqual({
      id: activeUser.id,
      name: activeUser.name,
      email: activeUser.email,
      role: "ADMIN",
    });
    expect(repository.recordSuccessfulLogin).toHaveBeenCalledOnce();
    expect(user).not.toHaveProperty("passwordHash");
  });

  it("rejeita senha incorreta e registra a falha", async () => {
    const repository = createRepository(activeUser);

    await expect(
      authenticateCredentials(
        {
          email: activeUser.email,
          password: "SenhaIncorreta123",
        },
        repository,
      ),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);

    expect(repository.recordFailedLogin).toHaveBeenCalledWith(
      activeUser.id,
      1,
      null,
    );
  });

  it("bloqueia temporariamente a conta na quinta falha", async () => {
    const repository = createRepository({
      ...activeUser,
      failedLoginAttempts: 4,
    });
    const now = new Date("2026-08-27T12:00:00.000Z");

    await expect(
      authenticateCredentials(
        { email: activeUser.email, password: "SenhaIncorreta123" },
        repository,
        now,
      ),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);

    expect(repository.recordFailedLogin).toHaveBeenCalledWith(
      activeUser.id,
      5,
      new Date("2026-08-27T12:15:00.000Z"),
    );
  });

  it("usa a mesma resposta genérica para usuário inexistente ou inativo", async () => {
    const missingRepository = createRepository(null);
    const inactiveRepository = createRepository({
      ...activeUser,
      status: "BLOCKED",
    });

    await expect(
      authenticateCredentials(
        { email: "inexistente@example.com", password: "SenhaQualquer123" },
        missingRepository,
      ),
    ).rejects.toMatchObject({ message: "Credenciais inválidas." });

    await expect(
      authenticateCredentials(
        { email: activeUser.email, password: "SenhaSegura123" },
        inactiveRepository,
      ),
    ).rejects.toMatchObject({ message: "Credenciais inválidas." });

    await expect(
      authenticateCredentials(
        { email: activeUser.email, password: "SenhaSegura123" },
        createRepository({ ...activeUser, status: "DELETED" }),
      ),
    ).rejects.toMatchObject({ message: "Credenciais inválidas." });
  });
});
