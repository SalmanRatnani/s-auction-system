import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import sharp from "sharp";
const require = createRequire(import.meta.url);
function load(path) {
  const loadedModule = { exports: {} };
  const compiled = ts.transpileModule(
    readFileSync(new URL(path, import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    },
  ).outputText;
  new Function("require", "module", "exports", compiled)(
    require,
    loadedModule,
    loadedModule.exports,
  );
  return loadedModule.exports;
}
const {
  isTrustedMutation,
  safeRedirectPath,
  readLimitedBody,
  BodyTooLargeError,
} = load("../src/lib/security/request.ts");
const { normalizeTeamLogo } = load("../src/lib/security/image.ts");
const request = (headers = {}, method = "POST") =>
  new Request("https://auction.example/api/bids", { method, headers });

test("cross-origin writes are blocked while same-origin and signed server transports remain possible", () => {
  assert.equal(
    isTrustedMutation(
      request({
        origin: "https://auction.example",
        "sec-fetch-site": "same-origin",
      }),
    ),
    true,
  );
  for (const headers of [
    { origin: "https://evil.example" },
    { origin: "null" },
    { "sec-fetch-site": "cross-site" },
    { origin: "https://sub.auction.example", "sec-fetch-site": "same-site" },
    { "sec-fetch-site": "same-site" },
  ])
    assert.equal(isTrustedMutation(request(headers)), false);
  assert.equal(isTrustedMutation(request()), true); // authentication/signature remains a route responsibility
  assert.equal(
    isTrustedMutation(request({ origin: "https://evil.example" }, "GET")),
    true,
  );
});
test("login return URLs cannot escape through slashes, backslashes or control characters", () => {
  for (const path of [
    null,
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "/\n/evil.example",
    "/%0a/evil.example",
    "/%5cevil.example",
  ])
    assert.equal(safeRedirectPath(path), "/dashboard");
  assert.equal(
    safeRedirectPath("/captain/bid?tab=team#current"),
    "/captain/bid?tab=team#current",
  );
  assert.equal(safeRedirectPath(null, "/viewer/live"), "/viewer/live");
});
test("body limits apply to declared and streamed payloads before buffering them", async () => {
  await assert.rejects(
    readLimitedBody(
      new Request("https://auction.example", {
        method: "POST",
        headers: { "Content-Length": "50" },
        body: "x",
      }),
      4,
    ),
    BodyTooLargeError,
  );
  const stream = new ReadableStream({
    start(c) {
      c.enqueue(new Uint8Array(3));
      c.enqueue(new Uint8Array(3));
      c.close();
    },
  });
  await assert.rejects(
    readLimitedBody(
      new Request("https://auction.example", {
        method: "POST",
        body: stream,
        duplex: "half",
      }),
      4,
    ),
    BodyTooLargeError,
  );
  assert.equal(
    new TextDecoder().decode(
      await readLimitedBody(
        new Request("https://auction.example", {
          method: "POST",
          body: "okay",
        }),
        4,
      ),
    ),
    "okay",
  );
});
test("logo uploads decode, resize and re-encode supported raster images", async () => {
  for (const format of ["png", "jpeg", "webp"]) {
    const input = await sharp({
      create: { width: 900, height: 600, channels: 3, background: "#d5f65b" },
    })
      [format]()
      .toBuffer();
    const output = await normalizeTeamLogo(input);
    const meta = await sharp(output).metadata();
    assert.equal(meta.format, "webp");
    assert.equal(meta.width, 512);
    assert.equal(meta.height, 341);
    assert.equal(meta.exif, undefined);
  }
});
test("logo uploads reject active content, corrupt files, huge images and oversized bodies", async () => {
  await assert.rejects(
    normalizeTeamLogo(
      Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect width="1" height="1"/></svg>',
      ),
    ),
  );
  await assert.rejects(
    normalizeTeamLogo(Buffer.from("<script>alert(1)</script>")),
  );
  await assert.rejects(normalizeTeamLogo(new Uint8Array(2 * 1024 * 1024 + 1)));
  const huge = await sharp({
    create: { width: 4100, height: 4100, channels: 3, background: "white" },
  })
    .png()
    .toBuffer();
  await assert.rejects(normalizeTeamLogo(huge));
});
