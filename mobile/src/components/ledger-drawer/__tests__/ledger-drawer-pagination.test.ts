import fs from "fs";
import path from "path";
import { DRAWER_LEDGERS_PAGE_SIZE } from "../drawer-ledgers";

/**
 * Static guardrail (w1/031): the quick-switch drawer must page its ledger
 * query explicitly, matching Browse → Your ledgers page one. The server
 * answers the no-argument `listLedgers` shape with a smaller default set
 * than the explicit `{page, limit}` shape, so a bare `useListLedgersQuery()`
 * silently drops ledgers Browse lists.
 */

const DRAWER_SOURCE = fs.readFileSync(
  path.join(__dirname, "..", "ledger-drawer.tsx"),
  "utf8",
);
const DISCOVERY_SOURCE = fs.readFileSync(
  path.join(
    __dirname,
    "..",
    "..",
    "..",
    "screens",
    "ledger-selection",
    "use-discovery.ts",
  ),
  "utf8",
);

/** Extract the call's argument text, balancing nested parens. */
function callArgument(source: string, openParen: number): string {
  let depth = 0;
  for (let i = openParen; i < source.length; i += 1) {
    const c = source[i];
    if (c === "(") depth += 1;
    if (c === ")") {
      depth -= 1;
      if (depth === 0) return source.slice(openParen + 1, i);
    }
  }
  throw new Error("unbalanced parens in useListLedgersQuery call");
}

describe("drawer ledger pagination", () => {
  it("asks for the same page size Browse pages with", () => {
    const match = DISCOVERY_SOURCE.match(/\bconst PAGE_SIZE\s*=\s*(\d+);/);
    expect(match === null).toBe(false);
    expect(DRAWER_LEDGERS_PAGE_SIZE).toBe(Number(match![1]));
  });

  it("passes explicit page/limit variables to useListLedgersQuery", () => {
    const callSites = [...DRAWER_SOURCE.matchAll(/useListLedgersQuery\(/g)];
    expect(callSites.length).toBe(1);
    const openParen = callSites[0].index! + "useListLedgersQuery".length;
    const args = callArgument(DRAWER_SOURCE, openParen);
    expect(args.includes("variables")).toBe(true);
    expect(args.includes("page")).toBe(true);
    expect(args.includes("DRAWER_LEDGERS_PAGE_SIZE")).toBe(true);
  });
});
