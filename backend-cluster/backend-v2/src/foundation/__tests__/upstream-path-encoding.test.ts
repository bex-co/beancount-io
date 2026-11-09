import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Every path parameter of the generated upstream clients is encoded as one
 * URL segment, so a caller's value cannot add segments, a query or a
 * fragment to the request. Only Gitea's wildcard routes keep a raw parameter,
 * and their services validate it (`scripts/generate-upstream-client.ts`).
 */
const MULTI_SEGMENT = new Set(["filepath", "branch", "ref", "basehead"]);

describe.each([
  ["ledger service", "../fava/Api.ts"],
  ["git host", "../../features/gitea/client/gitea-api.ts"],
])("the generated %s client", (_name, file) => {
  const source = readFileSync(resolve(__dirname, file), "utf8");
  const paths = [...source.matchAll(/path: `([^`]*)`/g)].map((m) => m[1]);

  it("has paths to check", () => {
    expect(paths.length).toBeGreaterThan(10);
  });

  it("interpolates only encoded or wildcard path parameters", () => {
    const raw = paths.flatMap((path) =>
      [...path.matchAll(/\$\{([^}]*)\}/g)]
        .map((m) => m[1])
        .filter(
          (expr) =>
            !/^encodeURIComponent\(\w+\)$/.test(expr) &&
            !MULTI_SEGMENT.has(expr),
        ),
    );
    expect(raw).toEqual([]);
  });
});
