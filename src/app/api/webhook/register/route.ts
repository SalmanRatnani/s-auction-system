import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type Body = {
  responseId: string;
  submittedAt: string;
  data: Record<string, unknown>;
  filePaths: { image?: { bucket: string; path: string }; proof?: { bucket: string; path: string } };
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
  if (body.filePaths.image?.path) {
    const { data } = admin.storage
      .from("player-images")
      .getPublicUrl(body.filePaths.image.path);
    imageUrl = data.publicUrl;
  }

  // For age proof we store ONLY the storage path (private bucket, signed URL later)
  const proofPath = body.filePaths.proof?.path ?? null;

  const { data, error } = await admin
    .from("registrations")
    .insert({
      google_response_id: body.responseId,
      raw: body,
      name: body.data.name as string,
      dob: body.data.dob as string,
      phone: body.data.phone as string,
      playing_centre: body.data.playingCentre as string,
      participation_history: body.data.participationHistory as string,
      played_mira_bhayandar: body.data.playedMiraBhayandar as boolean,
      achievements: (body.data.achievements as string) ?? null,
      age_proof_type: body.data.ageProofType as string,
      image_url: imageUrl,
      age_proof_url: proofPath,
      submitted_at: body.submittedAt,
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