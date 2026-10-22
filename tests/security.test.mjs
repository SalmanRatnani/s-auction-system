import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

function load(path, names) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const output = ts.transpileModule(source.replace(/export /g, ""), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  return new Function("require", "exports", output + "\nreturn {" + names.join(",") + "};")(requireStub, {});
}
function requireStub(name) { if (name === "node:crypto") return requireCrypto; throw Error(name); }
import * as requireCrypto from "node:crypto";

const { csvCell } = load("../src/lib/security/csv.ts", ["csvCell"]);
const { verifyWebhookSignature, validResponseId } = load("../src/lib/security/webhook.ts", ["verifyWebhookSignature", "validResponseId"]);
test("CSV handles dangerous spreadsheet cells", () => {
  for (const value of ["=cmd()", "+SUM(1,2)", "-2+3", "@SUM(A1)", "\t=1"]) {
    assert.equal(csvCell(value).startsWith("'"), true);
  }
  assert.equal(csvCell('a,"b"'), '"a,""b"""');
  assert.equal(csvCell("normal"), "normal");
});
test("webhook signing uses strict hex and rejects wrong secrets", () => {
  const raw = '{"ok":true}', secret = "fixture-only";
  const sig = requireCrypto.createHmac("sha256", secret).update(raw).digest("hex");
  assert.equal(verifyWebhookSignature(raw, sig, secret), true);
  assert.equal(verifyWebhookSignature(raw + " ", sig, secret), false);
  assert.equal(verifyWebhookSignature(raw, sig + "zz", secret), false);
});
test("response identifiers cannot escape storage path", () => {
  assert.equal(validResponseId("response_42-A"), true);
  for (const input of ["../secret", "foo/bar", "", "a".repeat(129), null]) assert.equal(validResponseId(input), false);
});
