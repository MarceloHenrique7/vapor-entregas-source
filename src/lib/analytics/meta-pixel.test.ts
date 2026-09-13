import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function browserWindow() {
  const storage = new Map<string, string>();
  return {
    sessionStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    },
  };
}

async function loadPixel(enabled = "true", id = "123456789") {
  vi.resetModules();
  process.env.NEXT_PUBLIC_META_PIXEL_ENABLED = enabled;
  process.env.NEXT_PUBLIC_META_PIXEL_ID = id;
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: browserWindow(),
  });
  return import("./meta-pixel");
}

describe("Meta Pixel", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, "window");
    delete process.env.NEXT_PUBLIC_META_PIXEL_ENABLED;
    delete process.env.NEXT_PUBLIC_META_PIXEL_ID;
  });

  it("não inicializa nem falha quando está desabilitado ou sem ID", async () => {
    const disabled = await loadPixel("false");
    expect(disabled.initMetaPixel()).toBe(false);
    expect(window.fbq).toBeUndefined();

    const missingId = await loadPixel("true", "");
    expect(missingId.initMetaPixel()).toBe(false);
    expect(window.fbq).toBeUndefined();
  });

  it("inicializa uma vez e não duplica PageView da mesma rota", async () => {
    const pixel = await loadPixel();

    expect(pixel.initMetaPixel()).toBe(true);
    expect(pixel.initMetaPixel()).toBe(true);
    expect(pixel.trackPageView("/")).toBe(true);
    expect(pixel.trackPageView("/")).toBe(false);
    expect(pixel.trackPageView("/planos")).toBe(true);

    expect(window.fbq?.queue).toEqual([
      ["init", "123456789"],
      ["track", "PageView", {}],
      ["track", "PageView", {}],
    ]);
  });

  it("deduplica eventos de conversão na sessão e não envia PII", async () => {
    const pixel = await loadPixel();
    const parameters = {
      registration_type: "company",
      platform: "vapor",
    };

    expect(
      pixel.trackMetaEventOnce(
        "registration:company:opaque-id",
        "CompleteRegistration",
        parameters,
      ),
    ).toBe(true);
    expect(
      pixel.trackMetaEventOnce(
        "registration:company:opaque-id",
        "CompleteRegistration",
        parameters,
      ),
    ).toBe(false);

    expect(JSON.stringify(window.fbq?.queue)).not.toMatch(
      /email|phone|cpf|cnpj|address/i,
    );
  });
});
