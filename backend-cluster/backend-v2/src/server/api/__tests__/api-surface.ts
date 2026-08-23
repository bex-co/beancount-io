import "reflect-metadata";
import http from "node:http";
import Router from "@koa/router";
import { config } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import { assembleApi, type ApiManifest } from "../composition-root";

/**
 * Assembling the real API for the drift guards.
 *
 * The guards have to enumerate what the process *actually* registers — a
 * hand-kept list of routes is the very thing they exist to catch — so this runs
 * the real composition root, all three surfaces, exactly as `start-server.ts`
 * does. What it does not need is the service layer: registration only closes
 * over `layers`, it never calls into it, so a stub that answers any access
 * keeps the guards to a second and no containers. The `http.Server` is likewise
 * never listened on; Apollo only wants something to register its drain hook
 * against.
 *
 * Files importing this must first `jest.mock` the two harness ESM packages
 * (`@ai-sdk/harness/agent`, `@ai-sdk/harness-claude-code`); their
 * `import.meta.url` cannot be evaluated under Jest's CommonJS transform, and
 * the ai-agent fragment pulls them in transitively.
 */

/** Answers any property access, call, or construction with itself. */
const stubLayers = new Proxy(function stub() {} as never, {
  get: (_target, prop) => (prop === "then" ? undefined : stubLayers),
  apply: () => stubLayers,
  construct: () => stubLayers,
}) as unknown as AppLayers;

let cached: Promise<ApiManifest> | undefined;

/** Assemble once per test file; the manifest is immutable. */
export function assembleTestApi(): Promise<ApiManifest> {
  cached ??= assembleApi(http.createServer(), new Router(), {
    layers: stubLayers,
    config,
  });
  return cached;
}
