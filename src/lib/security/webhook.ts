import { createHmac, timingSafeEqual } from "node:crypto";

export const MAX_WEBHOOK_BYTES = 64 * 1024;

export function verifyWebhookSignature(raw: string, supplied: string | null, secret: string | undefined) {
  if (!secret || !supplied || !/^[a-f\d]{64}$/i.test(supplied)) return false;
  const expected = createHmac("sha256", secret).update(raw).digest();
  return timingSafeEqual(expected, Buffer.from(supplied, "hex"));
}

export function validResponseId(value: unknown): value is string {
  return typeof value === "string" && /^[a-zA-Z0-9_-]{1,128}$/.test(value);
}
