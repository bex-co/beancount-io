import type {
  BeancountError,
  DirectiveJson,
  LedgerOptions,
} from "@rustledger/wasm";

/**
 * w31/138: stock bean-check drops a transaction's only posting when it has no
 * amount and reports nothing, while the engine reports `BOOK` "cannot infer
 * currency", so every surface called the ledger red. The engine is stubbed
 * with its own errors for the note's fixtures (WASM-free); the live check is
 * the same fixtures through the real engine in `verify:rustledger`.
 */
const error = (
  severity: "error" | "warning",
  code: string,
  message: string,
  line: number | null,
): BeancountError => ({
  message,
  code,
  phase: "validate",
  hint: null,
  file: line === null ? null : "main.bean",
  line,
  column: null,
  end_line: null,
  end_column: null,
  severity,
});

const OPEN = "2026-01-01 open Assets:Cash USD";
const open = (): DirectiveJson => ({
  type: "open",
  date: "2026-01-01",
  account: "Assets:Cash",
  currencies: ["USD"],
});
const transaction = (
  narration: string,
  ...accounts: string[]
): DirectiveJson => ({
  type: "transaction",
  date: "2026-09-07",
  flag: "*",
  payee: "qa",
  narration,
  tags: [],
  links: [],
  postings: accounts.map((account) => ({ account })),
});

/** What the engine reports for each fixture, keyed by its narration. */
const ENGINE: Record<string, { accounts: string[]; errors: BeancountError[] }> =
  {
    "single elided posting": {
      accounts: ["Assets:Cash"],
      errors: [
        error("warning", "E3004", "Transaction has only one posting", 2),
        error(
          "error",
          "BOOK",
          'interpolation failed: cannot infer currency for posting to account Assets:Cash (2026-09-07, "single elided posting")',
          null,
        ),
      ],
    },
    "two elided": {
      accounts: ["Assets:Cash", "Assets:Bank"],
      errors: [
        error(
          "error",
          "E3002",
          "Transaction has 2 postings with missing amounts; at most one is allowed when any of them has no currency to interpolate in",
          2,
        ),
        error(
          "error",
          "BOOK",
          'interpolation failed: cannot infer currency for posting to account Assets:Cash (2026-09-07, "two elided")',
          null,
        ),
      ],
    },
  };

const fixtureOf = (text: string) =>
  Object.entries(ENGINE).find(([narration]) => text.includes(narration));

jest.mock("@/foundation/rustledger/loader", () => ({
  loadRustledger: async () => ({
    Ledger: {
      fromFiles: (files: Record<string, string>, entryPoint: string) => {
        const fixture = fixtureOf(files[entryPoint]);
        const directives = () =>
          fixture === undefined
            ? [open()]
            : [open(), transaction(fixture[0], ...fixture[1].accounts)];
        return {
          isValid: () => fixture === undefined,
          getErrors: () =>
            fixture === undefined
              ? []
              : fixture[1].errors.map((e) => ({ ...e })),
          getOptions: () =>
            ({ title: null, operating_currencies: ["USD"] }) as LedgerOptions,
          getDirectives: directives,
          expandPads: () => ({
            directives: directives(),
            padding_transactions: [],
            errors: [],
          }),
          directiveCount: () => directives().length,
          free: () => undefined,
        };
      },
    },
  }),
}));

import {
  clearLedgerSnapshotCache,
  parseLedgerFilesInProcess,
} from "@/foundation/rustledger/engine";
import { buildEntryIdMap } from "@/foundation/rustledger/entry-hash";
import {
  getDirectiveSourceId,
  isUnbookedDirective,
} from "@/foundation/rustledger/plugins/provenance";

const ledger = (narration: string, ...postings: string[]) => ({
  "main.bean": [
    OPEN,
    `2026-09-07 * "qa" "${narration}"`,
    ...postings.map((account) => `  ${account}`),
    "",
  ].join("\n"),
});

beforeEach(() => clearLedgerSnapshotCache());

describe("a transaction whose only posting has no amount", () => {
  it("checks clean and is booked with no postings, as stock does", async () => {
    const snapshot = await parseLedgerFilesInProcess(
      ledger("single elided posting", "Assets:Cash"),
      "main.bean",
    );
    expect(snapshot.valid).toBe(true);
    expect(snapshot.errors.map((e) => [e.severity, e.code])).toEqual([
      ["warning", "E3004"],
    ]);
    const booked = snapshot.directives.find(
      (directive) => directive.type === "transaction",
    )!;
    expect(booked).toMatchObject({ postings: [] });
    expect(isUnbookedDirective(booked)).toBe(false);
    expect(snapshot.unbooked).toBeUndefined();
  });

  it("keeps the ID its source text hashes to, so the entry still opens", async () => {
    const snapshot = await parseLedgerFilesInProcess(
      ledger("single elided posting", "Assets:Cash"),
      "main.bean",
    );
    const written = transaction("single elided posting", "Assets:Cash");
    const sourceId = buildEntryIdMap([open(), written]).get(written);
    const booked = snapshot.directives.find(
      (directive) => directive.type === "transaction",
    )!;
    expect(getDirectiveSourceId(booked)).toBe(sourceId);
    expect(snapshot.sourceIds).toHaveLength(snapshot.directives.length);
  });

  it("still refuses two elided postings and leaves them unbooked", async () => {
    const snapshot = await parseLedgerFilesInProcess(
      ledger("two elided", "Assets:Cash", "Assets:Bank"),
      "main.bean",
    );
    expect(snapshot.valid).toBe(false);
    expect(snapshot.errors.map((e) => e.code)).toEqual(["E3002", "BOOK"]);
    const unbooked = snapshot.directives.find(
      (directive) => directive.type === "transaction",
    )!;
    expect(unbooked).toMatchObject({
      postings: [{ account: "Assets:Cash" }, { account: "Assets:Bank" }],
    });
    expect(isUnbookedDirective(unbooked)).toBe(true);
  });
});
