import { describe, expect, it } from "vitest";

import {
  DEFAULT_DATABASE_POOL_OPTIONS,
  withDatabasePoolOptions,
} from "./pool-config";

describe("configuração conservadora do pool MySQL", () => {
  it("adiciona limites seguros", () => {
    const configured = new URL(
      withDatabasePoolOptions("mysql://user:password@localhost:3306/app"),
    );

    expect(configured.searchParams.get("connectionLimit")).toBe("2");
    expect(configured.searchParams.get("minimumIdle")).toBe("0");
    expect(configured.searchParams.get("acquireTimeout")).toBe("15000");
  });

  it("preserva opções já definidas na DATABASE_URL", () => {
    const configured = new URL(
      withDatabasePoolOptions(
        "mysql://user:password@localhost:3306/app?connectionLimit=1&minimumIdle=0",
        DEFAULT_DATABASE_POOL_OPTIONS,
      ),
    );

    expect(configured.searchParams.get("connectionLimit")).toBe("1");
    expect(configured.searchParams.get("minimumIdle")).toBe("0");
  });
});
