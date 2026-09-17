import { describe, expect, it } from "vitest";

import { resolveDeliveryPaymentTransition } from "./payment-policy";

describe("política financeira VaporPay", () => {
  it("trata registros legados sem apagar dados", () => {
    expect(
      resolveDeliveryPaymentTransition("COMPANY", "MARK_PAID", "UNTRACKED"),
    ).toEqual({ kind: "update", status: "REPORTED_PAID" });
    expect(
      resolveDeliveryPaymentTransition(
        "MOTOBOY",
        "REPORT_NOT_RECEIVED",
        "UNTRACKED",
      ),
    ).toEqual({ kind: "update", status: "PENDING" });
  });

  it("gera divergência somente após a empresa informar pagamento", () => {
    expect(
      resolveDeliveryPaymentTransition(
        "MOTOBOY",
        "REPORT_NOT_RECEIVED",
        "REPORTED_PAID",
      ),
    ).toEqual({ kind: "update", status: "DISPUTED" });
    expect(
      resolveDeliveryPaymentTransition(
        "MOTOBOY",
        "REPORT_NOT_RECEIVED",
        "PENDING",
      ),
    ).toEqual({ kind: "update", status: "PENDING" });
  });

  it("separa as permissões da empresa e do motoboy", () => {
    expect(
      resolveDeliveryPaymentTransition(
        "COMPANY",
        "CONFIRM_RECEIPT",
        "REPORTED_PAID",
      ),
    ).toEqual({ kind: "forbidden" });
    expect(
      resolveDeliveryPaymentTransition("MOTOBOY", "MARK_PAID", "PENDING"),
    ).toEqual({ kind: "forbidden" });
  });

  it("torna repetições seguras e confirmação terminal", () => {
    expect(
      resolveDeliveryPaymentTransition("COMPANY", "MARK_PAID", "REPORTED_PAID"),
    ).toEqual({ kind: "noop" });
    expect(
      resolveDeliveryPaymentTransition(
        "MOTOBOY",
        "CONFIRM_RECEIPT",
        "CONFIRMED",
      ),
    ).toEqual({ kind: "noop" });
    expect(
      resolveDeliveryPaymentTransition(
        "MOTOBOY",
        "REPORT_NOT_RECEIVED",
        "CONFIRMED",
      ),
    ).toEqual({ kind: "conflict" });
  });
});
