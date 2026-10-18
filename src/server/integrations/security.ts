import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

export function createWebhookCredential() {
  const keyPrefix = randomBytes(9).toString("base64url");
  const secret = randomBytes(32).toString("base64url");
  return { keyPrefix, secret };
}

export function hashIntegrationPayload(payload: string) {
  return createHash("sha256").update(payload).digest("hex");
}

export function verifyWebhookSignature(input: {
  secret: string;
  timestamp: string;
  body: string;
  signature: string;
  now?: Date;
}) {
  if (!/^\d{10,13}$/.test(input.timestamp)) return false;
  const numeric = Number(input.timestamp);
  const timestampMs = input.timestamp.length === 10 ? numeric * 1_000 : numeric;
  const now = (input.now ?? new Date()).getTime();
  if (!Number.isFinite(timestampMs) || Math.abs(now - timestampMs) > 5 * 60_000)
    return false;
  const received = input.signature.replace(/^sha256=/i, "").toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(received)) return false;
  const expected = createHmac("sha256", input.secret)
    .update(`${input.timestamp}.${input.body}`)
    .digest("hex");
  return timingSafeEqual(
    Buffer.from(received, "hex"),
    Buffer.from(expected, "hex"),
  );
}
