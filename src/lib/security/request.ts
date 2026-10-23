/** Same-origin browser mutations only. Non-browser clients still need route authentication/signatures. */
export function isTrustedMutation(
  request: Pick<Request, "url" | "method" | "headers">,
): boolean {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method.toUpperCase()))
    return true;
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  const origin = request.headers.get("origin");
  if (!origin)
    return !["same-site", "cross-site"].includes(
      request.headers.get("sec-fetch-site") ?? "",
    );
  try {
    return (
      new URL(origin).origin === new URL(request.url).origin &&
      origin !== "null"
    );
  } catch {
    return false;
  }
}

/** Never allow a login return URL to escape this application. */
export function safeRedirectPath(
  value: string | null | undefined,
  fallback = "/dashboard",
): string {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\u0000-\u0020\u007f]/.test(value) ||
    /%(?:0[0-9a-f]|1[0-9a-f]|20|5c|7f)/i.test(value)
  )
    return fallback;
  try {
    const target = new URL(value, "https://auction.invalid");
    return target.origin === "https://auction.invalid"
      ? target.pathname + target.search + target.hash
      : fallback;
  } catch {
    return fallback;
  }
}

export class BodyTooLargeError extends Error {}
/** Enforce the limit while streaming, including requests with no Content-Length. */
export async function readLimitedBody(
  request: Request,
  maxBytes: number,
): Promise<Uint8Array> {
  const declared = Number(request.headers.get("content-length"));
  if (declared > maxBytes) throw new BodyTooLargeError("Payload too large");
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new BodyTooLargeError("Payload too large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}
