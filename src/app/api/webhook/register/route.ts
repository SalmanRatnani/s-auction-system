import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// The Google Form now collects ONLY:
// Full Name, Playing Hand, Playing Centre, Achievements, Player Photo.
type Body = {
  responseId: string;
  submittedAt: string;
  data: {
    name?: unknown;
    playingHand?: unknown;
    playingCentre?: unknown;
    achievements?: unknown;
  } & Record<string, unknown>;
  filePaths: { image?: { bucket: string; path: string } };
  warning?: string;
};

function verifySignature(rawBody: string, signature: string | null) {
  if (!signature) return false;
  const secret = process.env.REGISTRATION_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expected, "hex")
    );
  } catch {
    return false;
  }
}

/** Trimmed string, or null when empty / not a string. */
function clean(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

/** "Right", "right-handed", "R" → "Right"; same for Left. Anything else → null. */
function normalizeHand(v: unknown): "Right" | "Left" | null {
  const s = clean(v)?.toLowerCase();
  if (!s) return null;
  if (s.startsWith("r")) return "Right";
  if (s.startsWith("l")) return "Left";
  return null;
}

export async function POST(request: NextRequest) {
  const raw = await request.text();

  if (!verifySignature(raw, request.headers.get("x-signature"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: Body;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = clean(body.data?.name);
  if (!body.responseId || !name) {
    return NextResponse.json(
      { error: "responseId and name are required" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // Idempotency
  const { data: existing } = await admin
    .from("registrations")
    .select("id")
    .eq("google_response_id", body.responseId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ ok: true, id: existing.id, duplicate: true });
  }

  // Public URL for player image (from player-images bucket)
  let imageUrl: string | null = null;
  if (body.filePaths?.image?.path) {
    const { data } = admin.storage
      .from("player-images")
      .getPublicUrl(body.filePaths.image.path);
    imageUrl = data.publicUrl;
  }

  const { data, error } = await admin
    .from("registrations")
    .insert({
      google_response_id: body.responseId,
      raw: body,

      // Collected fields
      name,
      playing_hand: normalizeHand(body.data.playingHand),
      playing_centre: clean(body.data.playingCentre),
      achievements: clean(body.data.achievements),
      image_url: imageUrl,

      // No longer collected → always null
      dob: null,
      age: null,
      phone: null,
      participation_history: null,
      played_mira_bhayandar: null,
      age_proof_url: null,
      age_proof_type: null,

      submitted_at: body.submittedAt ?? new Date().toISOString(),
      status: "PENDING",
    })
    .select("id")
    .single();

  if (error) {
    console.error("Insert failed", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data.id });
}
