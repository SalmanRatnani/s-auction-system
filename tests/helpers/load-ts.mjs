import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve, dirname, extname } from "node:path";
import ts from "typescript";

const cache = new Map();
export function loadTs(path) {
  path = resolve(path);
  if (cache.has(path)) return cache.get(path);
  const module = { exports: {} };
  cache.set(path, module.exports);
  const native = createRequire(path);
  function require(name) {
    if (!name.startsWith(".") && !name.startsWith("@/")) return native(name);
    const file = name.startsWith("@/")
      ? resolve("src", name.slice(2))
      : resolve(dirname(path), name);
    for (const suffix of extname(file) ? [""] : [".ts", ".tsx"]) {
      try {
        return loadTs(file + suffix);
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
    }
    throw new Error(`Missing test module: ${file}`);
  }
  const output = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  new Function("require", "module", "exports", output)(
    require,
    module,
    module.exports,
  );
  return module.exports;
}
