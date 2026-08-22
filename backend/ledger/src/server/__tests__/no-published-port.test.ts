import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Guard that `directiveLimitExempt`'s unauthenticated header is not exposed
 * to the public internet. In the private deployment this is enforced by
 * running the ledger service without a published host port. When the compose
 * file is not present (open-source checkout), the check is skipped — the
 * invariant must then be enforced by the deployment's own network policy
 * (see src/server/auth.ts).
 */
const COMPOSE = resolve(__dirname, "../../../../_infra/docker-compose.yml");

/** The `ledger:` service block, up to the next top-level service. */
function ledgerServiceBlock(): string | null {
  if (!existsSync(COMPOSE)) return null;
  let source: string;
  try {
    source = readFileSync(COMPOSE, "utf8");
  } catch {
    return null;
  }
  const lines = source.split("\n");
  const start = lines.findIndex((l) => /^ {2}ledger:\s*$/.test(l));
  if (start < 0) return null;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => /^ {2}\S/.test(l));
  return (end === -1 ? rest : rest.slice(0, end)).join("\n");
}

it("ledger-v2 publishes no port in production (skipped when compose file absent)", () => {
  const block = ledgerServiceBlock();
  if (block === null) return;
  // `expose:` is fine — it is container-to-container. `ports:` is not: it binds
  // on the host, which is what puts these routes in reach of the internet.
  const published = block
    .split("\n")
    .filter((l) => /^\s{4}ports:\s*$/.test(l));

  expect(published).toEqual([]);
});

it("the guard is actually reading the right block (skipped when compose file absent)", () => {
  const block = ledgerServiceBlock();
  if (block === null) return;
  expect(block).toContain("beancount-ledger");
});
