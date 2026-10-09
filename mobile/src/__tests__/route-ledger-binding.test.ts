import fs from "fs";
import path from "path";
import { bindRouteLedger } from "../common/route-ledger";
import { resolveAppLink } from "../common/app-links/resolve-app-link";
import {
  openTransactionDetail,
  selectStashedTransaction,
  selectedTransactionVar,
} from "../screens/transaction-detail-screen/open-transaction-detail";
import type { JournalTransaction } from "../screens/transactions-screen/types";

// Retained detail routes (`.pm` w2/040, w2/042, w2/049): an app link selects
// its ledger and then replaces only the current history entry, so detail
// entries opened for the previous ledger survive behind it. Native Back revives
// one; it must not be read, queried or acted on under the new selection.

const EXAMPLE = "open_ledger/example";
const CRYPTO = "open_ledger/crypto-example";
const ORIGIN = "https://beancount.io";

const srcDir = path.join(__dirname, "..");
const read = (relative: string) =>
  fs.readFileSync(path.join(srcDir, relative), "utf8");

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    if (entry.name === "__tests__" || entry.name === "generated-graphql") {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...sourceFiles(full));
    } else if (/\.tsx?$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

/** The innermost `{ … }` literal that encloses `index`. */
function enclosingObject(source: string, index: number): string {
  let depth = 0;
  let start = index;
  for (; start >= 0; start -= 1) {
    if (source[start] === "}") depth += 1;
    if (source[start] === "{") {
      if (depth === 0) break;
      depth -= 1;
    }
  }
  depth = 0;
  for (let end = start; end < source.length; end += 1) {
    if (source[end] === "{") depth += 1;
    if (source[end] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, end + 1);
    }
  }
  return source.slice(start);
}

/**
 * Every navigation object naming `route` whose params carry `subjectKey` must
 * also carry `ledger` — in each branch of a conditional params object.
 */
function pushesMissingLedger(route: string, subjectKey: string): string[] {
  const offenders: string[] = [];
  const routeLiteral = new RegExp(`"(?:/\\(app\\)|/examples)?/${route}"`, "g");
  for (const file of sourceFiles(srcDir)) {
    const source = fs.readFileSync(file, "utf8");
    routeLiteral.lastIndex = 0;
    let match = routeLiteral.exec(source);
    while (match !== null) {
      const navigation = enclosingObject(source, match.index);
      if (/\bpathname\s*:/.test(navigation)) {
        const paramObjects = navigation
          .slice(1)
          .match(new RegExp(`\\{[^{}]*\\b${subjectKey}\\b[^{}]*\\}`, "g"));
        if (!paramObjects?.length) {
          offenders.push(`${path.relative(srcDir, file)} (no params)`);
        }
        for (const params of paramObjects ?? []) {
          if (!/\bledger\s*:/.test(params)) {
            offenders.push(path.relative(srcDir, file));
          }
        }
      }
      match = routeLiteral.exec(source);
    }
  }
  return offenders;
}

describe("bindRouteLedger", () => {
  it("binds a route to the selected ledger when they agree", () => {
    expect(bindRouteLedger(EXAMPLE, EXAMPLE)).toEqual({
      status: "ready",
      ledgerId: EXAMPLE,
    });
  });

  it("refuses a revived route from another ledger, and recovers on return", () => {
    expect(bindRouteLedger(EXAMPLE, CRYPTO)).toEqual({
      status: "mismatch",
      routeLedgerId: EXAMPLE,
      selectedLedgerId: CRYPTO,
    });
    expect(bindRouteLedger(EXAMPLE, EXAMPLE).status).toBe("ready");
  });

  it("trusts the selection for a route written without the param", () => {
    expect(bindRouteLedger(undefined, CRYPTO)).toEqual({
      status: "ready",
      ledgerId: CRYPTO,
    });
    expect(bindRouteLedger("", CRYPTO).status).toBe("ready");
    expect(bindRouteLedger([EXAMPLE, CRYPTO], CRYPTO).status).toBe("mismatch");
  });
});

describe("transaction detail is bound to its ledger (w2/040)", () => {
  const cafe = {
    entry_hash: "aff1ee23d8f70c970c137b006b4d8a62",
    payee: "Cafe Modagor",
  } as JournalTransaction;

  afterEach(() => {
    selectedTransactionVar(null);
  });

  it("an in-app tap pushes and stashes the entry with its ledger", () => {
    const pushes: { pathname: string; params: Record<string, string> }[] = [];
    const router = {
      push: (route: (typeof pushes)[number]) => pushes.push(route),
    } as unknown as Parameters<typeof openTransactionDetail>[0];

    openTransactionDetail(router, cafe, EXAMPLE);

    expect(pushes).toEqual([
      {
        pathname: "/transaction-detail",
        params: { entry_hash: cafe.entry_hash, ledger: EXAMPLE },
      },
    ]);
    // The exact reproduction: Example's Cafe detail, then a Crypto link, then
    // Back. The revived entry is refused rather than painted or queried.
    expect(bindRouteLedger(pushes[0].params.ledger, CRYPTO).status).toBe(
      "mismatch",
    );
    expect(bindRouteLedger(pushes[0].params.ledger, EXAMPLE).status).toBe(
      "ready",
    );
  });

  it("an equal hash in another ledger does not reuse the stash", () => {
    selectedTransactionVar({ ledgerId: EXAMPLE, entry: cafe });
    const stash = selectedTransactionVar();
    expect(
      selectStashedTransaction(stash, {
        entryHash: cafe.entry_hash,
        ledgerId: CRYPTO,
      }),
    ).toBe(null);
    expect(
      selectStashedTransaction(stash, {
        entryHash: cafe.entry_hash,
        ledgerId: EXAMPLE,
      }),
    ).toBe(cafe);
    expect(
      selectStashedTransaction(stash, {
        entryHash: "other",
        ledgerId: EXAMPLE,
      }),
    ).toBe(null);
    expect(
      selectStashedTransaction(null, {
        entryHash: cafe.entry_hash,
        ledgerId: EXAMPLE,
      }),
    ).toBe(null);
  });

  it("an entry app link names its ledger", () => {
    const target = resolveAppLink(
      `${ORIGIN}/ledger/${EXAMPLE}/entry/${cafe.entry_hash}`,
      { serverUrl: ORIGIN },
    );
    const params = (target!.href as { params: Record<string, string> }).params;
    expect(params).toEqual({ entry_hash: cafe.entry_hash, ledger: EXAMPLE });
    expect(bindRouteLedger(params.ledger, CRYPTO).status).toBe("mismatch");
  });

  it("every push to /transaction-detail passes a ledger param", () => {
    expect(pushesMissingLedger("transaction-detail", "entry_hash")).toEqual([]);
  });

  it("the screen resolves the route ledger before mounting its query body", () => {
    expectGuardedScreen({
      file: "screens/transaction-detail-screen/transaction-detail-screen.tsx",
      route: "TransactionDetailRoute",
      body: "TransactionDetailImpl",
      screen: "export const TransactionDetailScreen",
    });
  });
});

describe("merchant detail is bound to its ledger (w2/042)", () => {
  it("every push to /merchant-detail passes a ledger param", () => {
    expect(pushesMissingLedger("merchant-detail", "payee")).toEqual([]);
  });

  it("the same payee opened in two ledgers stays distinguishable", () => {
    // Cafe Modagor from Example, revived after a Crypto file link: refused.
    const fromExample = { payee: "Cafe Modagor", ledger: EXAMPLE };
    expect(bindRouteLedger(fromExample.ledger, CRYPTO).status).toBe("mismatch");
    expect(bindRouteLedger(fromExample.ledger, EXAMPLE).status).toBe("ready");
    const fromCrypto = { payee: "Cafe Modagor", ledger: CRYPTO };
    expect(bindRouteLedger(fromCrypto.ledger, CRYPTO).status).toBe("ready");
  });

  it("the screen resolves the route ledger before mounting its query body", () => {
    // The body owns the metadata/totals/journal queries and the recurring
    // toggle, so a mismatched route must never reach it.
    expectGuardedScreen({
      file: "screens/merchant-detail-screen/merchant-detail-screen.tsx",
      route: "MerchantDetailRoute",
      body: "MerchantDetailBody",
      screen: "export function MerchantDetailScreen",
    });
  });
});

describe("commit detail is bound to its ledger (w2/049)", () => {
  const HM = "open_ledger/hm";
  const SHA = "94b78d9aa1f0c3e5d7b9a1c3e5f7091b2d4f6a8c";

  it("every push to /commit-detail passes a ledger param", () => {
    expect(pushesMissingLedger("commit-detail", "sha")).toEqual([]);
  });

  it("a commit link names its repository, and identical SHAs stay apart", () => {
    const fromHm = resolveAppLink(`${ORIGIN}/ledger/${HM}/commit/${SHA}`, {
      serverUrl: ORIGIN,
    });
    const fromExample = resolveAppLink(
      `${ORIGIN}/ledger/${EXAMPLE}/commit/${SHA}`,
      { serverUrl: ORIGIN },
    );
    const hm = (fromHm!.href as { params: Record<string, string> }).params;
    const example = (fromExample!.href as { params: Record<string, string> })
      .params;
    expect(hm).toEqual({ sha: SHA, ledger: HM });
    expect(example).toEqual({ sha: SHA, ledger: EXAMPLE });
    // H&M's commit, revived after an Example file link: refused, then usable
    // again once H&M is reselected.
    expect(bindRouteLedger(hm.ledger, EXAMPLE).status).toBe("mismatch");
    expect(bindRouteLedger(hm.ledger, HM)).toEqual({
      status: "ready",
      ledgerId: HM,
    });
    expect(bindRouteLedger(example.ledger, EXAMPLE).status).toBe("ready");
  });

  it("the screen resolves the route ledger before mounting its query", () => {
    expectGuardedScreen({
      file: "screens/commit-detail-screen/commit-detail-screen.tsx",
      route: "CommitDetailRoute",
      body: "CommitDetailScreenImpl",
      screen: "export function CommitDetailScreen",
    });
    // The query takes the bound ledger from the route, not the global
    // selection, so no retained observer can pair this SHA with another one.
    const source = read(
      "screens/commit-detail-screen/commit-detail-screen.tsx",
    );
    expect(source.includes("ledgerVar")).toBe(false);
    expect(source.includes("ledgerId={binding.ledgerId}")).toBe(true);
  });
});

/**
 * `route` resolves `bindRouteLedger` and returns early on a mismatch before it
 * renders `body`; the exported `screen` mounts `route` (passing the `ledger`
 * param) and never `body` directly.
 */
function expectGuardedScreen(args: {
  file: string;
  route: string;
  body: string;
  screen: string;
}): void {
  const source = read(args.file);
  const routeStart = source.search(
    new RegExp(`(?:const|function) ${args.route}\\b`),
  );
  expect(routeStart >= 0).toBe(true);
  const route = source.slice(routeStart);
  const guard = route.indexOf("bindRouteLedger(ledger");
  const mismatch = route.indexOf('binding.status === "mismatch"');
  const body = route.indexOf(`<${args.body}`);
  expect(guard > 0 && mismatch > guard && body > mismatch).toBe(true);
  const screen = source.slice(source.indexOf(args.screen));
  expect(screen.includes(`<${args.route}`)).toBe(true);
  expect(screen.includes(`<${args.body}`)).toBe(false);
  expect(screen.includes("ledger={params.ledger}")).toBe(true);
}
