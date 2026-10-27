import { normalizePlayerImage } from "@/lib/security/image";
import { readLimitedBody } from "@/lib/security/request";
import {
  verifyWebhookSignature,
  validResponseId,
  MAX_WEBHOOK_BYTES,
} from "@/lib/security/webhook";
import { NextResponse, type NextRequest } from "next/server";
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
  let raw: string;
  try {
    raw = new TextDecoder().decode(
      await readLimitedBody(request, MAX_WEBHOOK_BYTES),
    );
  } catch {
    return NextResponse.json(
      { error: "Payload too large or unreadable" },
      { status: 413 },
    );
  }

  if (
    !verifyWebhookSignature(
      raw,
      request.headers.get("x-signature"),
      process.env.REGISTRATION_WEBHOOK_SECRET,
    )
  ) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: Body;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = clean(body?.data?.name);
  if (!validResponseId(body?.responseId) || !name || name.length > 200) {
    return NextResponse.json(
      { error: "responseId and name are required" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  // Idempotency
  const { data: existing, error: lookupError } = await admin
    .from("registrations")
    .select("id")
    .eq("google_response_id", body.responseId)
    .maybeSingle();

  if (lookupError)
    return NextResponse.json(
      { error: "Registration lookup unavailable" },
      { status: 503 },
    );
  if (existing) {
    return NextResponse.json({ ok: true, id: existing.id, duplicate: true });
  }

  // Public URL for player image (from player-images bucket)
  let imageUrl: string | null = null;
  if (body.filePaths?.image?.path) {
    const image = body.filePaths.image;
    const allowed = new RegExp(
      `^20[0-9]{2}/${body.responseId}/image\\.(jpg|png|webp)$`,
    );
    if (image.bucket !== "player-images" || !allowed.test(image.path))
      return NextResponse.json(
        { error: "Image does not belong to this response" },
        { status: 400 },
      );
    const { data: source, error: downloadError } = await admin.storage
      .from("player-images")
      .download(image.path);
    if (downloadError || !source)
      return NextResponse.json(
        { error: "Uploaded image is unavailable" },
        { status: 400 },
      );
    try {
      const normalized = await normalizePlayerImage(
        new Uint8Array(await source.arrayBuffer()),
      );
      const path = image.path.replace(
        /image\.(jpg|png|webp)$/,
        "verified.webp",
      );
      const { error: uploadError } = await admin.storage
        .from("player-images")
        .upload(path, normalized, { contentType: "image/webp", upsert: true });
      if (uploadError) throw new Error("Image processing failed");
      imageUrl = admin.storage.from("player-images").getPublicUrl(path)
        .data.publicUrl;
    } catch {
      return NextResponse.json(
        { error: "Upload a valid still JPEG, PNG, or WebP image up to 5 MB" },
        { status: 400 },
      );
    }
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
    if (error.code === "23505") {
      const { data: existing } = await admin
        .from("registrations")
        .select("id")
        .eq("google_response_id", body.responseId)
        .maybeSingle();
      if (existing)
        return NextResponse.json({
          ok: true,
          id: existing.id,
          duplicate: true,
        });
    }
    console.error("registration_insert_failed", { code: error.code });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data.id });
}
