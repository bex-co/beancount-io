jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({
  createACP: () => ({}),
}));

import fs from "node:fs";
import path from "node:path";

import { assembleTestApi } from "@/server/api/__tests__/api-surface";
import {
  V1_DECLARED_ROUTES,
  type RestMount,
} from "@/server/api/composition-root";
import { registry, generateV1OpenAPIDocument } from "../openapi-registry";
import { toKoaPath, toOpenApiPath } from "../v1-route";
import { normalizeRestPath } from "@/server/api/rest-op-id";

/**
 * ADR 0006 D8 — mounted, registered, and declared must agree.
 *
 * The drift this catches is not theoretical: the pre-v1 archive route declared
 * `/ledgers/{ledgerId}/archive/{archive}` to the spec while mounting
 * `/api-gateway/ledgers/:ledgerId/archive/:archive`, so the published contract
 * named a URL that 404s and nothing noticed. Three checks, one per direction
 * something can go missing:
 *
 * 1. A mounted `/v1` route with no `registerRoute` — live surface nobody
 *    documented.
 * 2. A registered `/v1` route with no mount — documentation for something that
 *    is not there, which is worse than silence because a client will try it.
 * 3. A declared path that is not a mounted path — the archive bug's shape,
 *    checked across every registered route, not just v1's.
 *
 * Plus the snapshot: `docs/openapi/v1.json` must match what the process would
 * serve, so a contract change is visible in the diff of the change that caused
 * it.
 */

/**
 * Routes under `/v1` that are documentation infrastructure rather than part of
 * the resource contract. Each needs a reason, on the same principle as the
 * always-public census: an exception nobody wrote down is an exception nobody
 * can re-examine.
 */
const V1_INFRASTRUCTURE: ReadonlyMap<string, string> = new Map([
  [
    "GET /v1/openapi.json",
    "The spec document itself. Documenting it inside itself would be circular, and it is not a ledger resource.",
  ],
]);

const mountKey = (mount: Pick<RestMount, "method" | "path">) =>
  `${mount.method} ${mount.path}`;

/** Every path the router will actually match, in `{param}` form. */
function mountedPaths(mounts: readonly RestMount[]): Set<string> {
  return new Set(mounts.map(mountKey));
}

/** Every route the OpenAPI registry knows, as `<METHOD> <path>`. */
function registeredRoutes(): { method: string; path: string }[] {
  return registry.definitions
    .filter((def) => def.type === "route")
    .map((def) => ({
      method: def.route.method.toUpperCase(),
      path: def.route.path,
    }));
}

/**
 * A registered path is compared against mounts after the same wildcard
 * translation the v1 helper does, because OpenAPI has no wildcard syntax:
 * `{*path}` is mounted, `{path}` is declared, and they are the same route.
 */
const declaredToMounted = (
  declaredPath: string,
  mounted: Set<string>,
  method: string,
) =>
  mounted.has(`${method} ${declaredPath}`) ||
  [...mounted].some(
    (key) =>
      key.startsWith(`${method} `) &&
      toOpenApiPath(key.slice(method.length + 1)) === declaredPath,
  );

describe("openapi completeness", () => {
  let mounts: readonly RestMount[];
  let mounted: Set<string>;

  beforeAll(async () => {
    ({ restMounts: mounts } = await assembleTestApi());
    mounted = mountedPaths(mounts);
  });

  it("documents every mounted /v1 route", () => {
    const registered = new Set(
      registeredRoutes().map((route) => `${route.method} ${route.path}`),
    );
    const undocumented = mounts
      .filter((mount) => mount.path.startsWith("/v1"))
      .map(mountKey)
      .filter((key) => {
        if (V1_INFRASTRUCTURE.has(key)) return false;
        const [method, ...rest] = key.split(" ");
        return !registered.has(`${method} ${toOpenApiPath(rest.join(" "))}`);
      });
    expect(undocumented).toEqual([]);
  });

  it("mounts every /v1 route it documents", () => {
    const unmounted = V1_DECLARED_ROUTES.map(
      (route) =>
        `${route.method.toUpperCase()} ${normalizeRestPath(toKoaPath(route.path))}`,
    ).filter((key) => !mounted.has(key));
    expect(unmounted).toEqual([]);
  });

  it("declares the path it actually mounts", () => {
    // The check the archive drift needed: run over every registered route, not
    // only v1's, since the bug was in a pre-v1 one.
    const mismatched = registeredRoutes()
      .filter((route) => !declaredToMounted(route.path, mounted, route.method))
      .map((route) => `${route.method} ${route.path}`);
    expect(mismatched).toEqual([]);
  });

  it("matches the checked-in spec snapshot", () => {
    const snapshotPath = path.resolve(
      __dirname,
      "../../../../docs/openapi/v1.json",
    );
    const snapshot = fs.readFileSync(snapshotPath, "utf8");
    const live = JSON.stringify(generateV1OpenAPIDocument(), null, 2) + "\n";
    // A mismatch means the contract moved: run `yarn generate-v1-openapi` and
    // review the diff as part of the change.
    expect(snapshot).toEqual(live);
  });

  it("keeps the admin surface out of the public v1 document", () => {
    const doc = generateV1OpenAPIDocument();
    const paths = Object.keys(doc.paths ?? {});
    expect(paths.filter((p) => !p.startsWith("/v1"))).toEqual([]);
  });

  it("gives every /v1 infrastructure exception a reason", () => {
    for (const reason of V1_INFRASTRUCTURE.values()) {
      expect(reason.trim().length).toBeGreaterThan(40);
    }
  });
});
