/** A lost response retains its ID and exact input so retry cannot repeat a sale/top-up. */
export type PendingAction = { url: string; body: Record<string, unknown> };
export async function sendAction(
  url: string,
  payload: Record<string, unknown>,
  pending: { current: PendingAction | null },
) {
  if (pending.current && pending.current.url !== url)
    throw new Error("Retry the unconfirmed action before starting another.");
  pending.current ??= {
    url,
    body: { ...payload, actionId: crypto.randomUUID() },
  };
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(pending.current.body),
    signal: AbortSignal.timeout(12_000),
  });
  const body = await response.json();
  // A server error can occur after commit. Preserve the action ID until its outcome is known.
  if (response.ok || (response.status >= 400 && response.status < 500))
    pending.current = null;
  return { response, body };
}
