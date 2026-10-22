import { verifyWebhookSignature, validResponseId, MAX_WEBHOOK_BYTES } from "@/lib/security/webhook";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type FileMeta = { kind: "image" | "proof"; name: string; mimeType: string };
type Body = { responseId: string; files: FileMeta[] };

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
  if (Number(request.headers.get("content-length") || 0) > MAX_WEBHOOK_BYTES) return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  const raw = await request.text();
  if (Buffer.byteLength(raw, "utf8") > MAX_WEBHOOK_BYTES) return NextResponse.json({ error: "Payload too large" }, { status: 413 });

  if (!verifyWebhookSignature(raw, request.headers.get("x-signature"), process.env.REGISTRATION_WEBHOOK_SECRET)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: Body;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!validResponseId(body?.responseId) || !Array.isArray(body.files) || body.files.length > 3) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const admin = createAdminClient();
  const year = new Date().getFullYear();
  const uploads = [];

  for (const f of body.files) {
    if (!f || (f.kind !== "image" && f.kind !== "proof") || !["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(f.mimeType) || (f.kind === "image" && f.mimeType === "application/pdf")) return NextResponse.json({ error: "Invalid file type" }, { status: 400 });

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