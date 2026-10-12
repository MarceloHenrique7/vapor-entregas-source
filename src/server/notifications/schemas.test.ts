import { describe, expect, it } from "vitest";

import { isTrustedPushEndpoint, pushSubscriptionSchema } from "./schemas";

describe("validação de Web Push", () => {
  it("aceita somente endpoints HTTPS dos serviços push conhecidos", () => {
    expect(
      isTrustedPushEndpoint("https://fcm.googleapis.com/fcm/send/example"),
    ).toBe(true);
    expect(
      isTrustedPushEndpoint(
        "https://updates.push.services.mozilla.com/wpush/v2/example",
      ),
    ).toBe(true);
    expect(
      isTrustedPushEndpoint("https://example.notify.windows.com/wpush/example"),
    ).toBe(true);
    expect(isTrustedPushEndpoint("http://fcm.googleapis.com/example")).toBe(
      false,
    );
    expect(
      isTrustedPushEndpoint("https://fcm.googleapis.com.evil.test/x"),
    ).toBe(false);
  });

  it("rejeita chaves ou endpoints manipulados", () => {
    expect(() =>
      pushSubscriptionSchema.parse({
        endpoint: "https://127.0.0.1/internal",
        keys: { p256dh: "not valid!", auth: "also invalid!" },
      }),
    ).toThrow();
  });
});
