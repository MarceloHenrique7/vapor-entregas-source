import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

async function source(path: string) {
  return readFile(join(process.cwd(), path), "utf8");
}

describe("experiência autenticada", () => {
  it("mantém uma única entrada de Gestão Pro e redireciona a rota antiga", async () => {
    const [navigation, legacyRoute, dashboard] = await Promise.all([
      source("src/components/dashboard/navigation.ts"),
      source("src/app/app/empresa/relatorios/page.tsx"),
      source("src/components/company-pro/company-pro-dashboard.tsx"),
    ]);

    expect(navigation).toContain('label: "Gestão Pro"');
    expect(navigation).not.toContain('label: "Relatórios Pro"');
    expect(legacyRoute).toContain('redirect("/app/empresa/gestao")');
    expect(dashboard).not.toContain("reportMode");
    expect(dashboard).toContain("Exportar dados em CSV");
    expect(dashboard).toContain("Pagamentos pendentes");
    expect(dashboard).toContain("Custo por quilômetro");
  });

  it("não renderiza endereço exato nem observações privadas antes do aceite", async () => {
    const opportunities = await source(
      "src/components/deliveries/motoboy-opportunities-list.tsx",
    );

    expect(opportunities).toContain("O endereço exato é exibido após o aceite");
    expect(opportunities).not.toContain("delivery.destinationAddress");
    expect(opportunities).not.toContain("delivery.destinationNumber");
    expect(opportunities).not.toContain("delivery.notes");
  });

  it("traduz os estados de pagamento para linguagem humana", async () => {
    const deliveryConfig = await source("src/config/delivery.ts");

    expect(deliveryConfig).toContain("Empresa informou pagamento");
    expect(deliveryConfig).toContain("Pagamento confirmado");
    expect(deliveryConfig).toContain("Pagamento com pendência");
  });
});
