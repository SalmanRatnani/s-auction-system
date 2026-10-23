import sharp from "sharp";

export const MAX_LOGO_BYTES = 2 * 1024 * 1024;
/** Decode and re-encode uploaded images: reject spoofed types and strip metadata. */
export async function normalizeTeamLogo(input: Uint8Array): Promise<Buffer> {
  if (!input.length || input.length > MAX_LOGO_BYTES)
    throw new Error("Logo must be between 1 byte and 2 MB");
  // Reject active formats before asking an image decoder to inspect the file.
  const bytes = Buffer.from(input.buffer, input.byteOffset, input.byteLength);
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng = bytes
    .subarray(0, 8)
    .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const isWebp =
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP";
  if (!isJpeg && !isPng && !isWebp)
    throw new Error("Upload a still JPEG, PNG or WebP image");
  const image = sharp(input, {
    limitInputPixels: 16_000_000,
    failOn: "warning",
  });
  const metadata = await image.metadata();
  if (
    !metadata.format ||
    !["jpeg", "png", "webp"].includes(metadata.format) ||
    (metadata.pages ?? 1) > 1
  ) {
    throw new Error("Upload a still JPEG, PNG or WebP image");
  }
  return image
    .rotate()
    .resize(512, 512, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 88 })
    .toBuffer();
}
