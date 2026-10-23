import { writeFile, mkdir } from "node:fs/promises";
import sharp from "sharp";

await mkdir("public/brand", { recursive: true });
const artwork =
  '<rect width="48" height="48" rx="13" fill="#D5F65B"/><path d="M32 11H20L10 24h16l-5 7H11l-4 6h15l11-15H17l4-5h7l4-6Z" fill="#101820"/><path d="m35 11-5 7h7l5-7h-7Z" fill="#101820"/>';
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">${artwork}</svg>`;
for (const file of [
  "public/favicon.svg",
  "src/app/icon.svg",
  "public/brand/s-auction-mark.svg",
])
  await writeFile(file, svg);
const wordmark = `<svg xmlns="http://www.w3.org/2000/svg" width="430" height="100" viewBox="0 0 430 100"><g transform="translate(5 10) scale(1.6)">${artwork}</g><text x="100" y="56" font-family="Arial,sans-serif" font-weight="700" font-size="39" fill="#f5f7fa" letter-spacing="-2">S AUCTION</text><text x="103" y="78" font-family="Arial,sans-serif" font-weight="600" font-size="9" fill="#bac6d4" letter-spacing="3">THE TEAM STARTS HERE</text></svg>`;
await writeFile("public/brand/s-auction-wordmark.svg", wordmark);
const icon = Buffer.from(svg);
for (const [file, size] of [
  ["apple-touch-icon.png", 180],
  ["favicon-96x96.png", 96],
  ["web-app-manifest-192x192.png", 192],
  ["web-app-manifest-512x512.png", 512],
]) {
  // App icons have a solid safe-area background for rounded launcher masks.
  const mark = await sharp(icon)
    .resize(Math.round(size * 0.76))
    .png()
    .toBuffer();
  await sharp({
    create: { width: size, height: size, channels: 4, background: "#101820" },
  })
    .composite([{ input: mark, gravity: "center" }])
    .png()
    .toFile(`public/${file}`);
}
const sizes = [16, 32, 48];
const pngs = await Promise.all(
  sizes.map((size) => sharp(icon).resize(size).png().toBuffer()),
);
const header = Buffer.alloc(6 + sizes.length * 16);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
pngs.forEach((png, i) => {
  const start = 6 + i * 16;
  header[start] = sizes[i];
  header[start + 1] = sizes[i];
  header.writeUInt16LE(1, start + 4);
  header.writeUInt16LE(32, start + 6);
  header.writeUInt32LE(png.length, start + 8);
  header.writeUInt32LE(offset, start + 12);
  offset += png.length;
});
await writeFile("public/favicon.ico", Buffer.concat([header, ...pngs]));
const cover = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#101b27"/><path d="M880 -50 1250 320v180L700 -50Z" fill="#d5f65b" opacity=".08"/><g transform="translate(78 65) scale(1.4)">${artwork}</g><text x="165" y="112" font-family="Arial,sans-serif" font-weight="700" font-size="34" fill="#f3f6ef">S AUCTION</text><text x="76" y="280" font-family="Arial,sans-serif" font-weight="800" font-size="82" fill="#f3f6ef" letter-spacing="-4">GREAT TEAMS START</text><text x="76" y="376" font-family="Arial,sans-serif" font-weight="800" font-size="82" fill="#d5f65b" letter-spacing="-4">WITH A BOLD BID.</text><text x="80" y="490" font-family="Arial,sans-serif" font-size="23" fill="#bac6d4">Real-time badminton auctions. One connected arena.</text><path d="M80 550h1040" stroke="#d5f65b" stroke-width="2"/></svg>`;
await sharp(Buffer.from(cover)).png().toFile("public/brand/social-cover.png");
console.log(
  "Generated vector brand marks, app icons, favicon and social cover.",
);
