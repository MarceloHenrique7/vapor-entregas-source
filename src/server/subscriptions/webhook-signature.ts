import { createHmac, timingSafeEqual } from "node:crypto";

import { InvalidWebhookSignatureError } from "./errors";

function signatureParts(value: string) {
  return new Map(
    value.split(",").map((part) => {
      const [key, ...rest] = part.trim().split("=");
      return [key, rest.join("=")];
    }),
  );
}

export function buildWebhookManifest(
  dataId: string,
  requestId: string,
  timestamp: string,
) {
  const normalizedDataId = /[A-Z]/.test(dataId) ? dataId.toLowerCase() : dataId;
  return `id:${normalizedDataId};request-id:${requestId};ts:${timestamp};`;
}

export function validateMercadoPagoSignature(input: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
  secret: string | undefined;
}) {
  if (
    !input.xSignature ||
    !input.xRequestId ||
    !input.dataId ||
    !input.secret
  ) {
    throw new InvalidWebhookSignatureError();
  }
  const parts = signatureParts(input.xSignature);
  const timestamp = parts.get("ts");
  const received = parts.get("v1");
  if (!timestamp || !received || !/^[a-f0-9]{64}$/i.test(received)) {
    throw new InvalidWebhookSignatureError();
  }
  const expected = createHmac("sha256", input.secret)
    .update(buildWebhookManifest(input.dataId, input.xRequestId, timestamp))
    .digest("hex");
  const receivedBuffer = Buffer.from(received, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  if (
    receivedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(receivedBuffer, expectedBuffer)
  ) {
    throw new InvalidWebhookSignatureError();
  }
}
