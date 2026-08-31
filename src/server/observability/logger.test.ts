import { afterEach, describe, expect, it, vi } from "vitest";

import { Prisma } from "@/generated/prisma/client";

import {
  internalErrorResponse,
  logServerError,
} from "@/server/observability/logger";

function createPrismaError() {
  const driverAdapterError = Object.assign(
    new Error("Driver adapter request failed"),
    {
      cause: {
        originalCode: "45028",
        originalMessage:
          "pool failed to retrieve a connection from pool (active=0 idle=0 limit=10)",
        password: "private-password",
        nested: {
          MERCADO_PAGO_ACCESS_TOKEN: "APP_USR-private-token",
        },
      },
    },
  );
  return new Prisma.PrismaClientKnownRequestError(
    "Database error. Code: `45028`. Message: `pool failed to retrieve a connection`; DATABASE_URL=mysql://private-user:private-password@localhost:3306/private-db; token=private-token",
    {
      code: "P2039",
      clientVersion: "7.10.0",
      meta: {
        modelName: "SubscriptionPlan",
        driverAdapterError,
        DATABASE_URL:
          "mysql://private-user:private-password@localhost:3306/private-db",
      },
    },
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("server error logging", () => {
  it("logs useful Prisma metadata while redacting sensitive values", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const correlationId = logServerError(
      "api.subscriptions",
      createPrismaError(),
    );

    expect(consoleError).toHaveBeenCalledOnce();
    const logged = JSON.parse(String(consoleError.mock.calls[0]?.[0])) as {
      scope: string;
      correlationId: string;
      errorType: string;
      errorCode: string;
      errorMessage: string;
      errorMeta: {
        DATABASE_URL: string;
        driverAdapterError: {
          cause: {
            originalCode: string;
            originalMessage: string;
            password: string;
            nested: { MERCADO_PAGO_ACCESS_TOKEN: string };
          };
        };
      };
    };

    expect(logged).toMatchObject({
      scope: "api.subscriptions",
      correlationId,
      errorType: "PrismaClientKnownRequestError",
      errorCode: "P2039",
    });
    expect(logged.errorMessage).toContain("45028");
    expect(logged.errorMessage).toContain("pool failed");
    expect(logged.errorMessage).not.toContain("private-user");
    expect(logged.errorMessage).not.toContain("private-password");
    expect(logged.errorMessage).not.toContain("private-token");
    expect(logged.errorMeta.driverAdapterError.cause).toMatchObject({
      originalCode: "45028",
      originalMessage:
        "pool failed to retrieve a connection from pool (active=0 idle=0 limit=10)",
      password: "[REDACTED]",
      nested: { MERCADO_PAGO_ACCESS_TOKEN: "[REDACTED]" },
    });
    expect(logged.errorMeta.DATABASE_URL).toBe("[REDACTED]");
  });

  it("keeps Prisma details out of the public response", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = internalErrorResponse(
      "api.registration",
      createPrismaError(),
    );
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(500);
    expect(body).toMatchObject({
      error: "Não foi possível concluir esta operação agora.",
      code: "INTERNAL_ERROR",
    });
    expect(body.correlationId).toEqual(expect.any(String));
    expect(body).not.toHaveProperty("errorMessage");
    expect(body).not.toHaveProperty("errorMeta");
  });
});
