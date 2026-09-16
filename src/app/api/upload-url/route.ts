import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type FileMeta = { kind: "image" | "proof"; name: string; mimeType: string };
type Body = { responseId: string; files: FileMeta[] };

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

function extFromMime(mime: string, fallback = "bin") {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "application/pdf": "pdf",
  };
  return map[mime] ?? fallback;
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

  if (!body.responseId || !Array.isArray(body.files)) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const admin = createAdminClient();
  const year = new Date().getFullYear();
  const uploads = [];

  for (const f of body.files) {
    if (f.kind !== "image" && f.kind !== "proof") continue;

    const bucket = f.kind === "image" ? "player-images" : "age-proofs";
    const ext = extFromMime(f.mimeType);
    const path = `${year}/${body.responseId}/${f.kind}.${ext}`;

    const { data, error } = await admin.storage
      .from(bucket)
      .createSignedUploadUrl(path);

    if (error || !data) {
      return NextResponse.json(
        { error: `Signed URL failed for ${f.kind}: ${error?.message}` },
        { status: 500 }
      );
    }

    uploads.push({
      kind: f.kind,
      bucket,
      path,
      token: data.token,
      signedUrl: data.signedUrl,
    });
  }

  return NextResponse.json({ uploads });
}