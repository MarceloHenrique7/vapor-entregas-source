import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const source = (path: string) => readFile(join(process.cwd(), path), "utf8");

describe("ganhos e acompanhamento simplificado", () => {
  it("keeps the motoboy earnings area reachable from navigation", async () => {
    const [navigation, page] = await Promise.all([
      source("src/components/dashboard/navigation.ts"),
      source("src/app/app/motoboy/ganhos/page.tsx"),
    ]);

    expect(navigation).toContain('href: "/app/motoboy/ganhos"');
    expect(navigation).toContain('label: "Ganhos"');
    expect(page).toContain("<MotoboyEarnings");
  });

  it("states that earnings are informational and not a platform wallet", async () => {
    const earnings = await source(
      "src/components/earnings/motoboy-earnings.tsx",
    );

    expect(earnings).toContain("Recebido confirmado");
    expect(earnings).toContain("A confirmar");
    expect(earnings).toContain("a plataforma não guarda saldo");
    expect(earnings).not.toMatch(/saque|transferir saldo/i);
  });

  it("shortens company cards and groups secondary delivery details", async () => {
    const [list, details] = await Promise.all([
      source("src/components/deliveries/company-deliveries-list.tsx"),
      source("src/components/deliveries/delivery-detail-card.tsx"),
    ]);

    expect(list).toContain("Acompanhar");
    expect(list).not.toContain("Ver acompanhamento →");
    expect(details).toContain("Pagamento e adicionais");
    expect(details).toContain("Histórico da entrega");
    expect(details).toContain("<details>");
  });
});
