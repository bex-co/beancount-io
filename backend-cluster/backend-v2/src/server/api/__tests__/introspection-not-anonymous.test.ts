import "reflect-metadata";

// The ai-agent fragment transitively loads the harness ESM packages, whose
// `import.meta.url` Jest's CommonJS transform cannot evaluate. Nothing here
// calls them.
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({
  createACP: () => ({}),
}));

import Router, { type RouterContext } from "@koa/router";
import { config as realConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import { restErrorMiddleware } from "@/server/rest/error-middleware";
import { setTokenIntrospectionRoutes } from "@/features/apikeys/api/token-introspection-rest";
import { ALWAYS_PUBLIC } from "../always-public";
import { assembleTestApi } from "./api-surface";

/**
 * The introspection endpoint is authenticated, proven against what is mounted.
 *
 * This is a regression test for a specific trap, not a restatement of the
 * route's declaration. `always-public.ts` carries
 * `REST ALL /api-gateway/oauth/{*path}` — correct for the OAuth ceremony, where
 * requiring a token to obtain a token would close the only door in. Mount
 * introspection anywhere under that prefix and it becomes anonymous **while
 * every existing guard stays green**: the census test compares mounts against
 * entries in both directions, and the catch-all already covers the path, so
 * nothing is missing and nothing complains.
 *
 * An endpoint that answers anonymously turns any stolen credential into
 * "valid, user X, may write ledger Y", and is a free oracle against the
 * API-key digest lookup. So the check has to be about the mounted path and the
 * mounted gate, not about the declaration — reading the declaration is how the
 * trap gets missed (ADR 0017 D1).
 */

const INTROSPECT_PATH = "/api-gateway/v1/token/introspect";

/** The always-public entry that would silently swallow a bad mount. */
const OAUTH_CATCH_ALL = "REST ALL /api-gateway/oauth/{*path}";

describe("the introspection endpoint is never anonymous", () => {
  it("is actually mounted, so the rest of this file is not vacuous", async () => {
    const { restMounts } = await assembleTestApi();

    expect(
      restMounts.some(
        (mount) => mount.path === INTROSPECT_PATH && mount.method === "POST",
      ),
    ).toBe(true);
  });

  it("is not covered by the OAuth ceremony's always-public catch-all", async () => {
    // The catch-all is still there — if it ever goes away this test should be
    // re-read rather than silently passing for a new reason.
    expect(ALWAYS_PUBLIC.map((entry) => entry.opId)).toContain(OAUTH_CATCH_ALL);

    expect(INTROSPECT_PATH.startsWith("/api-gateway/oauth/")).toBe(false);
  });

  it("has no always-public census entry of its own", async () => {
    const exempted = ALWAYS_PUBLIC.filter((entry) =>
      entry.opId.includes(INTROSPECT_PATH),
    );

    expect(exempted).toEqual([]);
  });

  it("is mounted under an enforcing gate, not outside the gate", async () => {
    const { restMounts } = await assembleTestApi();

    const mount = restMounts.find(
      (candidate) =>
        candidate.path === INTROSPECT_PATH && candidate.method === "POST",
    );

    expect(mount).toBeDefined();
    expect(mount?.gate).toBe("enforced");
  });

  /**
   * The runtime half. The checks above say the mount is in the right place;
   * this one dispatches a credential-less request at the real route and reads
   * what comes back, because "declared correctly" and "refuses" are two
   * different claims and only the second one is the guarantee.
   *
   * A stub service layer is enough: if the handler is ever reached, that is
   * itself the failure this test exists to catch.
   */
  it("refuses a request carrying no credential at all", async () => {
    const reached = jest.fn();
    const stubLayers = new Proxy(function stub() {} as never, {
      get: (_t, prop) => (prop === "then" ? undefined : stubLayers),
      apply: () => {
        reached();
        return stubLayers;
      },
      construct: () => stubLayers,
    }) as unknown as AppLayers;

    const router = new Router();
    router.use(restErrorMiddleware());
    setTokenIntrospectionRoutes(router, stubLayers, realConfig);

    const ctx = {
      method: "POST",
      path: INTROSPECT_PATH,
      host: "localhost",
      status: 404,
      body: undefined,
      // No `ctx.state.identity`: this is what the identity middleware leaves
      // behind for a request with no Authorization header, no cookie, and no
      // x-api-key.
      state: {},
      request: { body: { token: "bcio_anything" } },
      headers: {},
    } as unknown as RouterContext;

    await router.routes()(ctx, async () => undefined);

    expect(ctx.status).toBe(401);
    // Crucially NOT `{ active: false }` — that would mean the endpoint answers
    // anonymously, and an attacker would read it as "not live" and keep
    // probing. The oracle would be open while appearing shut (ADR 0017 D6).
    expect(ctx.body).not.toMatchObject({ active: false });
    expect(reached).not.toHaveBeenCalled();
  });
});
