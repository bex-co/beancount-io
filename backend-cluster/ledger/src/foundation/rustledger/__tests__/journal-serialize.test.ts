import type { DirectiveJson } from "@rustledger/wasm";
import {
  CustomSubtype,
  DirectiveType,
  DocumentSubtype,
  TransactionSubtype,
} from "@/foundation/ledger-api-types";
import {
  directiveToText,
  filterCustomSubtypes,
  filterDirectiveTypes,
  filterDocumentSubtypes,
  filterTransactionSubtypes,
  serializeDirective,
  type JournalItem,
} from "../journal-serialize";
import golden from "./journal-serialize.golden.json";

/**
 * Golden-validated against the REAL Python fava-slim + beancount: both sides
 * parse the SAME source (`golden.source`); `golden.rustledger` is the
 * `@rustledger/wasm` `getDirectives()` output and `golden.pythonSerialized` /
 * `golden.pythonPlaintext` are `serialize_directive()` / `to_string(_,_indent=2)`
 * captured from the venv. See journal-serialize.ts PARITY NOTES for the three
 * documented divergences normalized below.
 */

const rustledger = golden.rustledger as unknown as DirectiveJson[];
const pythonSerialized = golden.pythonSerialized as Array<
  Record<string, unknown>
>;
const pythonPlaintext = golden.pythonPlaintext as Array<{
  type: string;
  text?: string;
}>;

/** Drop `filename`/`lineno`/dunder from a Python golden meta (unavailable from rustledger). */
function normalizeGoldenMeta(
  meta: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!meta) return null;
  const out: Record<string, unknown> = {};
  let has = false;
  Object.keys(meta).forEach((key) => {
    if (key === "filename" || key === "lineno") return;
    if (key.startsWith("__") && key.endsWith("__")) return;
    out[key] = meta[key];
    has = true;
  });
  return has ? out : null;
}

/**
 * Normalize a serialized item to the fields both sides can produce identically:
 * strip `entry_hash` (hash-input divergence), reduce `meta` to user keys, and
 * for documents drop `filename` (rustledger has the relative path, Python the
 * Gitea-resolved absolute path).
 */
function normalizeItem(item: Record<string, unknown>): Record<string, unknown> {
  const { entry_hash: _hash, ...rest } = item;
  const normalized: Record<string, unknown> = {
    ...rest,
    meta: normalizeGoldenMeta(item.meta as Record<string, unknown> | null),
  };
  if (Array.isArray(item.postings)) {
    normalized.postings = (item.postings as Array<Record<string, unknown>>).map(
      (posting) => ({
        ...posting,
        meta: normalizeGoldenMeta(
          posting.meta as Record<string, unknown> | null,
        ),
      }),
    );
  }
  if (item.directive_type === DirectiveType.Document) {
    delete normalized.filename;
  }
  return normalized;
}

describe("serializeDirective (golden parity)", () => {
  it("has aligned golden fixtures", () => {
    expect(rustledger.length).toBe(pythonSerialized.length);
    expect(rustledger.length).toBeGreaterThan(10);
  });

  rustledger.forEach((directive, index) => {
    it(`matches Python serialize_directive for #${index} (${directive.type})`, () => {
      const actual = serializeDirective(directive) as unknown as Record<
        string,
        unknown
      >;
      const expected = pythonSerialized[index];
      expect(normalizeItem(actual)).toEqual(normalizeItem(expected));
    });
  });

  it("maps directive_type for every directive", () => {
    rustledger.forEach((directive, index) => {
      expect(
        (serializeDirective(directive) as JournalItem).directive_type,
      ).toBe(pythonSerialized[index].directive_type);
    });
  });

  it("produces a stable 32-hex entry_hash", () => {
    rustledger.forEach((directive) => {
      const item = serializeDirective(directive);
      expect(item.entry_hash).toMatch(/^[0-9a-f]{32}$/);
      // deterministic
      expect(serializeDirective(directive).entry_hash).toBe(item.entry_hash);
    });
  });

  it("serializes transaction tags/links/postings and flags", () => {
    const txnIndex = rustledger.findIndex(
      (d) => d.type === "transaction" && d.tags.includes("income"),
    );
    const item = serializeDirective(
      rustledger[txnIndex],
    ) as import("@/foundation/ledger-api-types").JournalTransactionPublic;
    expect(item.flag).toBe("*");
    expect(item.payee).toBe("Employer");
    expect(item.narration).toBe("Salary");
    expect(item.tags).toEqual(["income"]);
    expect(item.links).toEqual(["ref-1"]);
    expect(item.postings).toHaveLength(2);
    expect(item.postings[0].units).toEqual({
      number: "3000.00",
      currency: "USD",
    });
  });

  it("serializes cost on a posting (per-unit number, currency, date, label)", () => {
    const txn = rustledger.find(
      (d) => d.type === "transaction" && d.postings.some((p) => p.cost),
    );
    const item = serializeDirective(
      txn as DirectiveJson,
    ) as import("@/foundation/ledger-api-types").JournalTransactionPublic;
    const withCost = item.postings.find((p) => p.cost);
    expect(withCost?.cost).toEqual({
      number: "150.00",
      currency: "USD",
      date: "2024-01-16",
      label: "lot1",
    });
  });

  it("flattens custom values (account/string/amount/bool/date)", () => {
    const custom = rustledger.find((d) => d.type === "custom");
    const item = serializeDirective(
      custom as DirectiveJson,
    ) as import("@/foundation/ledger-api-types").JournalCustomPublic;
    expect(item.type).toBe("budget");
    expect(item.values).toEqual([
      "Expenses:Food",
      "monthly",
      { number: "100.00", currency: "USD" },
      true,
      "2024-01-01",
    ]);
  });

  it("serializes open currencies=null when there are none", () => {
    const openNoCcy: DirectiveJson = {
      type: "open",
      date: "2024-01-01",
      account: "Assets:X",
      currencies: [],
    };
    const item = serializeDirective(
      openNoCcy,
    ) as import("@/foundation/ledger-api-types").JournalOpenPublic;
    expect(item.currencies).toBeNull();
    expect(item.booking).toBeNull();
  });
});

describe("directiveToText (golden parity vs to_string _indent=2)", () => {
  rustledger.forEach((directive, index) => {
    it(`matches Python to_string for #${index} (${directive.type})`, () => {
      let expected = pythonPlaintext[index].text as string;
      // Documented gap: Python resolves the document path to a Gitea absolute
      // path; rustledger keeps the source-relative path. Normalize the expected
      // path back to rustledger's relative one before comparing the render.
      if (directive.type === "document") {
        expected = expected.replace(
          /"[^"]*statement\.pdf"/,
          `"${directive.path}"`,
        );
      }
      expect(directiveToText(directive)).toBe(expected);
    });
  });

  it("normalizes a defensive raw total cost to its per-unit value", () => {
    const directive: DirectiveJson = {
      type: "transaction",
      date: "2024-01-01",
      flag: "*",
      narration: "total cost",
      tags: [],
      links: [],
      postings: [
        {
          account: "Assets:Broker",
          units: { number: "10", currency: "HOOL" },
          cost: {
            number: { kind: "total", value: "1000.00" },
            currency: "USD",
          },
        },
      ],
    };
    const item = serializeDirective(
      directive,
    ) as import("@/foundation/ledger-api-types").JournalTransactionPublic;
    expect(item.postings[0].cost?.number).toBe("100.00");
    expect(directiveToText(directive)).toContain("10 HOOL {100.00 USD}");
  });
});

describe("filterDirectiveTypes", () => {
  const txn = serializeDirective(
    rustledger.find((d) => d.type === "transaction") as DirectiveJson,
  );
  const open = serializeDirective(
    rustledger.find((d) => d.type === "open") as DirectiveJson,
  );

  it("passes everything when no types requested", () => {
    expect(filterDirectiveTypes(txn, [])).toBe(true);
  });
  it("keeps matching types only", () => {
    expect(filterDirectiveTypes(txn, [DirectiveType.Transaction])).toBe(true);
    expect(filterDirectiveTypes(open, [DirectiveType.Transaction])).toBe(false);
    expect(
      filterDirectiveTypes(open, [
        DirectiveType.Transaction,
        DirectiveType.Open,
      ]),
    ).toBe(true);
  });
});

describe("filterTransactionSubtypes", () => {
  function txnWithFlag(flag: string): JournalItem {
    return serializeDirective({
      type: "transaction",
      date: "2024-01-01",
      flag,
      tags: [],
      links: [],
      postings: [],
    });
  }
  const openItem = serializeDirective(
    rustledger.find((d) => d.type === "open") as DirectiveJson,
  );

  it("passes when no subtypes", () => {
    expect(filterTransactionSubtypes(txnWithFlag("*"), [])).toBe(true);
  });
  it("lets non-transactions pass through", () => {
    expect(
      filterTransactionSubtypes(openItem, [TransactionSubtype.Cleared]),
    ).toBe(true);
  });
  it("matches cleared (*), pending (!), other", () => {
    expect(
      filterTransactionSubtypes(txnWithFlag("*"), [TransactionSubtype.Cleared]),
    ).toBe(true);
    expect(
      filterTransactionSubtypes(txnWithFlag("*"), [TransactionSubtype.Pending]),
    ).toBe(false);
    expect(
      filterTransactionSubtypes(txnWithFlag("!"), [TransactionSubtype.Pending]),
    ).toBe(true);
    expect(
      filterTransactionSubtypes(txnWithFlag("P"), [TransactionSubtype.Other]),
    ).toBe(true);
    expect(
      filterTransactionSubtypes(txnWithFlag("*"), [TransactionSubtype.Other]),
    ).toBe(false);
  });
});

describe("filterDocumentSubtypes", () => {
  function docWithTags(tags: string[]): JournalItem {
    return serializeDirective({
      type: "document",
      date: "2024-01-01",
      account: "Assets:X",
      path: "x.pdf",
      tags,
    });
  }
  it("passes when no subtypes / non-documents", () => {
    expect(filterDocumentSubtypes(docWithTags(["discovered"]), [])).toBe(true);
    const txn = serializeDirective(
      rustledger.find((d) => d.type === "transaction") as DirectiveJson,
    );
    expect(filterDocumentSubtypes(txn, [DocumentSubtype.Discovered])).toBe(
      true,
    );
  });
  it("matches discovered / linked tags", () => {
    expect(
      filterDocumentSubtypes(docWithTags(["discovered"]), [
        DocumentSubtype.Discovered,
      ]),
    ).toBe(true);
    expect(
      filterDocumentSubtypes(docWithTags(["linked"]), [DocumentSubtype.Linked]),
    ).toBe(true);
    expect(
      filterDocumentSubtypes(docWithTags(["other"]), [
        DocumentSubtype.Discovered,
        DocumentSubtype.Linked,
      ]),
    ).toBe(false);
  });
});

describe("filterCustomSubtypes", () => {
  it("passes when no subtypes / non-customs", () => {
    const custom = serializeDirective(
      rustledger.find((d) => d.type === "custom") as DirectiveJson,
    );
    expect(filterCustomSubtypes(custom, [])).toBe(true);
    const txn = serializeDirective(
      rustledger.find((d) => d.type === "transaction") as DirectiveJson,
    );
    expect(filterCustomSubtypes(txn, [CustomSubtype.Budget])).toBe(true);
  });
  it("matches budget customs only", () => {
    const budget = serializeDirective(
      rustledger.find((d) => d.type === "custom") as DirectiveJson,
    );
    expect(filterCustomSubtypes(budget, [CustomSubtype.Budget])).toBe(true);
    const other = serializeDirective({
      type: "custom",
      date: "2024-01-01",
      custom_type: "note",
      values: [],
    });
    expect(filterCustomSubtypes(other, [CustomSubtype.Budget])).toBe(false);
  });
});
