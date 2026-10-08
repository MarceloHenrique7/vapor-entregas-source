import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const source = (path: string) => readFile(join(process.cwd(), path), "utf8");

describe("experiência unificada de endereço e mapa", () => {
  it("reutiliza o mesmo seletor na localização da empresa e na nova entrega", async () => {
    const [companyLocation, newDelivery] = await Promise.all([
      source("src/components/maps/company-location-form.tsx"),
      source("src/components/deliveries/new-delivery-form.tsx"),
    ]);

    expect(companyLocation).toContain("<AddressLocationPicker");
    expect(newDelivery).toContain("<AddressLocationPicker");
    expect(newDelivery).not.toContain("Confirme o destino no mapa");
  });

  it("mantém campos detalhados sob edição progressiva e o PIN no mesmo fluxo", async () => {
    const picker = await source(
      "src/components/maps/address-location-picker.tsx",
    );

    expect(picker).toContain("Editar detalhes");
    expect(picker).toContain("Local identificado");
    expect(picker).toContain("<CompanyLocationMapLoader");
    expect(picker).toContain("Complemento");
    expect(picker).toContain("Referência");
    expect(picker).toContain("Encontrar endereço");
    expect(picker).toContain("Confirmar PIN");
    expect(picker).toContain("Editar detalhes");
    expect(picker).toContain("ArrowDown");
    expect(picker).toContain("arraste o PIN");
  });

  it("permite confirmar uma busca diretamente pelo teclado", async () => {
    const picker = await source(
      "src/components/maps/address-location-picker.tsx",
    );

    expect(picker).toContain('placeholder="Rua, número, bairro ou CEP"');
    expect(picker).toContain("if (suggestions.length === 0)");
    expect(picker).toContain("onLocate();");
  });

  it("troca a grade extensa de adicionais por condições compactas", async () => {
    const newDelivery = await source(
      "src/components/deliveries/new-delivery-form.tsx",
    );

    expect(newDelivery).toContain("<SpecialConditionsField");
    expect(newDelivery).toContain('label="Condição especial"');
    expect(newDelivery).toContain("Adicionar outra condição");
    expect(newDelivery).not.toContain("Condições especiais e adicionais");
  });
});
