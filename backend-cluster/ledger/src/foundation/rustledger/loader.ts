import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

/**
 * The `@rustledger/wasm` module namespace, typed from the package's own
 * `.d.ts`. `typeof import(...)` is erased at compile time, so referencing it
 * here does NOT trigger a runtime module load.
 */
export type RustledgerModule = typeof import("@rustledger/wasm");

/**
 * A genuine dynamic `import()`. TypeScript compiling to `module: "commonjs"`
 * rewrites a literal `import()` into `require()`, which cannot load an ESM-only
 * (`"type": "module"`) package like `@rustledger/wasm`. Building the importer
 * through `new Function` hides the call from that transform so the real Node
 * ESM loader runs at runtime.
 *
 * Note: under Jest's CommonJS test environment this dynamic import requires
 * `NODE_OPTIONS=--experimental-vm-modules`. Production (`ts-node` / compiled
 * `node`) needs no flag. Keep unit tests off the live WASM path (test the pure
 * mappers instead); exercise the real engine via `scripts/verify-rustledger.ts`.
 */
const dynamicImport = new Function("specifier", "return import(specifier)") as (
  specifier: string,
) => Promise<RustledgerModule>;

let modulePromise: Promise<RustledgerModule> | null = null;

/**
 * Load and one-time-initialize the `@rustledger/wasm` module (idempotent,
 * memoized). The package is a `wasm-pack --target web` build whose default
 * async initializer resolves the `.wasm` via `import.meta.url` + `fetch` —
 * both unavailable under Node/CommonJS. We sidestep that by reading the sibling
 * `.wasm` bytes off disk and calling the synchronous `initSync` instead.
 */
export function loadRustledger(): Promise<RustledgerModule> {
  if (!modulePromise) {
    const attempt = (async () => {
      const nodeRequire = createRequire(__filename);
      // Resolve the package main JS, then read the `.wasm` next to it. We do
      // NOT resolve the `.wasm` as a module subpath — jest-resolve cannot.
      const mainJsPath = nodeRequire.resolve("@rustledger/wasm");
      const wasmBytes = readFileSync(
        join(dirname(mainJsPath), "rustledger_wasm_bg.wasm"),
      );

      const mod = await dynamicImport("@rustledger/wasm");
      mod.initSync({ module: wasmBytes });
      return mod;
    })();
    // A failed load (e.g. a transient FS error reading the .wasm) must NOT be
    // memoized forever — clear the memo on rejection so the next call retries
    // instead of every future caller inheriting the same dead promise.
    // Concurrent callers still share the one in-flight attempt.
    attempt.catch(() => {
      if (modulePromise === attempt) {
        modulePromise = null;
      }
    });
    modulePromise = attempt;
  }
  return modulePromise;
}
