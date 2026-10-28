import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { readLimitedBody } from "@/lib/security/request";

export const UUID = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

export async function runAuctionCommand(
  request: NextRequest,
  auctionId: string,
  command: string,
  extra: Record<string, unknown> = {},
) {
  const requestId = crypto.randomUUID();
  const reply = (body: object, status = 200) =>
    NextResponse.json(body, {
      status,
      headers: { "Cache-Control": "no-store", "X-Request-ID": requestId },
    });
  if (!UUID.test(auctionId)) return reply({ error: "Invalid auction ID" }, 400);
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return reply({ error: "Sign in to continue" }, 401);
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(
      new TextDecoder().decode(await readLimitedBody(request, 16_384)),
    );
    if (!body || Array.isArray(body) || typeof body !== "object")
      throw new Error();
  } catch {
    return reply({ error: "A valid action payload is required" }, 400);
  }
  const { actionId, ...input } = body;
  if (typeof actionId !== "string" || !UUID.test(actionId))
    return reply({ error: "Reload the page before continuing" }, 400);
  if (
    command !== "topup" &&
    (!Number.isSafeInteger(input.expectedVersion) ||
      Number(input.expectedVersion) < 0)
  ) {
    return reply({ error: "Refresh the auction before continuing" }, 409);
  }
  if (
    command === "topup" &&
    (!Number.isSafeInteger(input.amount) ||
      Number(input.amount) <= 0 ||
      Number(input.amount) > 100_000_000_000)
  )
    return reply({ error: "Top-up must be a positive integer amount" }, 400);
  const { data, error } = await client.rpc("auction_command", {
    p_auction_id: auctionId,
    p_command: command,
    p_action_id: actionId,
    p_payload: { ...input, ...extra },
  });
  if (error) {
    console.error("auction_command_failed", {
      requestId,
      command,
      auctionId,
      code: error.code,
    });
    const expected = ["P0001", "40001", "42501"].includes(error.code);
    return reply(
      {
        error: expected
          ? error.message
          : "The action could not be confirmed. Refresh and retry.",
        requestId,
      },
      error.code === "42501" ? 403 : expected ? 409 : 500,
    );
  }
  return reply(data);
}
