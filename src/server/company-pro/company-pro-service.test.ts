import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { escapeCsvCell, resolveCompanyProPeriod } from "./company-pro-service";

describe("Vapor Gestão Pro", () => {
  it("resolve o dia usando o fuso de Bahia", () => {
    const period = resolveCompanyProPeriod(
      { period: "today" },
      new Date("2026-09-16T02:30:00.000Z"),
    );
    expect(period.from.toISOString()).toBe("2026-09-15T03:00:00.000Z");
    expect(period.to.toISOString()).toBe("2026-09-16T03:00:00.000Z");
  });

  it("aceita intervalo personalizado inclusivo até o fim do dia local", () => {
    const period = resolveCompanyProPeriod({
      period: "custom",
      from: "2026-09-01",
      to: "2026-09-10",
    });
    expect(period.from.toISOString()).toBe("2026-09-01T03:00:00.000Z");
    expect(period.to.toISOString()).toBe("2026-09-11T03:00:00.000Z");
  });

  it("bloqueia fórmulas em células CSV", () => {
    expect(escapeCsvCell("=HYPERLINK('x')")).toBe("\"'=HYPERLINK('x')\"");
    expect(escapeCsvCell("@SUM(A1:A2)")).toBe('"\'@SUM(A1:A2)"');
    expect(escapeCsvCell("Nome normal")).toBe('"Nome normal"');
  });
});
