import type { DirectiveJson, PostingJson } from "@rustledger/wasm";
import {
  buildEntryIdMap,
  entryIdFor,
  hashEntry,
  parseEntryId,
} from "../entry-hash";
import golden from "./entry-hash.golden.json";

/**
 * Golden-parity tests for {@link hashEntry}.
 *
 * Every fixture in `entry-hash.golden.json` carries BOTH:
 *   - `directive`: the exact `DirectiveJson` emitted by the real
 *     `@rustledger/wasm` engine (`withLedger(files, entry, l => l.getDirectives())`)
 *     for the fixture's `source`, and
 *   - `expectedHash`: the golden hash produced by the real Python
 *     `beancount.core.compare.hash_entry(entry, exclude_meta=True)` for the SAME
 *     `source` (captured via the in-repo `beancount-ledger/.venv`).
 *
 * The test asserts `hashEntry(directive) === expectedHash` for each — i.e. the
 * TS port reproduces beancount's MD5 field-walk byte-for-byte. See
 * `entry-hash.ts`'s docstring for why the `exclude_meta=True` variant is the
 * reproducible target (rustledger's `DirectiveJson` carries no filename/lineno).
 * The tag-less document fixture constructs the equivalent Python `Document`
 * with its source-relative filename because `load_string()` otherwise resolves
 * that field to the host's absolute working-directory path.
 */

interface GoldenEntry {
  directive: DirectiveJson;
  expectedHash: string;
  beancountType: string;
}

interface GoldenCase {
  name: string;
  source: string;
  entries: GoldenEntry[];
}

const cases = (golden as { cases: GoldenCase[] }).cases;

describe("hashEntry — Fava/beancount parity", () => {
  test.each(cases.map((c) => [c.name, c] as const))(
    "matches beancount golden hash: %s",
    (_name, goldenCase) => {
      goldenCase.entries.forEach((entry) => {
        expect(hashEntry(entry.directive)).toBe(entry.expectedHash);
      });
    },
  );

  it("covers every non-custom directive type across the fixtures", () => {
    const covered = new Set<string>(
      cases.flatMap((c) => c.entries.map((e) => e.directive.type)),
    );
    for (const type of [
      "transaction",
      "balance",
      "open",
      "close",
      "commodity",
      "pad",
      "note",
      "event",
      "price",
      "document",
      "query",
    ]) {
      expect(covered.has(type)).toBe(true);
    }
  });

  it("produces a lowercase 32-char MD5 hex digest", () => {
    const first = cases[0].entries[0];
    const hash = hashEntry(first.directive);
    expect(hash).toMatch(/^[0-9a-f]{32}$/);
  });

  it("is deterministic and order-insensitive for a transaction's postings", () => {
    // Swapping posting order must not change the hash — beancount sorts the
    // per-posting subhashes before folding them in.
    const txn = cases.find((c) => c.name === "simple_txn")?.entries[0]
      .directive as Extract<DirectiveJson, { type: "transaction" }>;
    const reversed: DirectiveJson = {
      ...txn,
      postings: [...txn.postings].reverse(),
    };
    expect(hashEntry(reversed)).toBe(hashEntry(txn));
  });

  it("is insensitive to tag/link ordering (frozenset semantics)", () => {
    const txn = cases.find((c) => c.name === "txn_tags_links_meta")?.entries[0]
      .directive as Extract<DirectiveJson, { type: "transaction" }>;
    const shuffled: DirectiveJson = {
      ...txn,
      tags: [...txn.tags].reverse(),
      links: [...txn.links].reverse(),
    };
    expect(hashEntry(shuffled)).toBe(hashEntry(txn));
  });
});

describe("cost-kind collision avoidance", () => {
  function txnWith(posting: PostingJson): DirectiveJson {
    return {
      type: "transaction",
      date: "2024-01-01",
      flag: "*",
      narration: "buy",
      tags: [],
      links: [],
      postings: [
        posting,
        { account: "Assets:Cash", units: { number: "-100", currency: "USD" } },
      ],
    };
  }
  const held = (kind: Record<string, unknown>): PostingJson => ({
    account: "Assets:Investments",
    units: { number: "10", currency: "HOOL" },
    cost: { number: kind as never, currency: "USD" },
  });
  const noCost: PostingJson = {
    account: "Assets:Investments",
    units: { number: "10", currency: "HOOL" },
  };

  it("does not hash a total-cost posting as cost-less (was the E103 collision)", () => {
    const total = hashEntry(txnWith(held({ kind: "total", value: "1000" })));
    const none = hashEntry(txnWith(noCost));
    expect(total).not.toBe(none);
  });

  it("distinguishes compound / total / per_unit costs (and none collide with no-cost)", () => {
    const perUnit = hashEntry(
      txnWith(held({ kind: "per_unit", value: "100" })),
    );
    const compound = hashEntry(
      txnWith(held({ kind: "compound", per_unit: "100", total: "5" })),
    );
    const total = hashEntry(txnWith(held({ kind: "total", value: "1000" })));
    const none = hashEntry(txnWith(noCost));
    // Each distinct cost kind is distinct from every other and from no-cost.
    expect(new Set([perUnit, compound, total]).size).toBe(3);
    for (const h of [perUnit, compound, total]) expect(h).not.toBe(none);
    // A `per_unit_from_total` that resolves to the SAME per-unit number is the
    // same booked lot as a `per_unit` cost, so it correctly shares its hash.
    const fromTotal = hashEntry(
      txnWith(held({ kind: "per_unit_from_total", per_unit: "100" })),
    );
    expect(fromTotal).toBe(perUnit);
  });
});

describe("occurrence-disambiguated entry IDs", () => {
  it("entryIdFor / parseEntryId round-trip", () => {
    expect(entryIdFor("abc", 0)).toBe("abc");
    expect(entryIdFor("abc", 3)).toBe("abc:3");
    expect(parseEntryId("abc")).toEqual({ base: "abc", occurrence: 0 });
    expect(parseEntryId("abc:3")).toEqual({ base: "abc", occurrence: 3 });
    // A malformed suffix falls back to occurrence 0 (whole string is the base).
    expect(parseEntryId("abc:x")).toEqual({ base: "abc:x", occurrence: 0 });
  });

  it("assigns base to the first identical entry and base:k to later ones", () => {
    const dup: DirectiveJson = {
      type: "transaction",
      date: "2024-01-01",
      flag: "*",
      narration: "coffee",
      tags: [],
      links: [],
      postings: [
        { account: "Expenses:Coffee", units: { number: "5", currency: "USD" } },
        { account: "Assets:Cash", units: { number: "-5", currency: "USD" } },
      ],
    };
    const other: DirectiveJson = {
      ...dup,
      narration: "tea",
    };
    const a = { ...dup };
    const b = { ...dup };
    const c = { ...other };
    const ids = buildEntryIdMap([a, b, c]);
    const base = hashEntry(dup);
    expect(ids.get(a)).toBe(base);
    expect(ids.get(b)).toBe(`${base}:1`);
    // A non-duplicate keeps its plain content hash (occurrence 0).
    expect(ids.get(c)).toBe(hashEntry(other));
  });
});
