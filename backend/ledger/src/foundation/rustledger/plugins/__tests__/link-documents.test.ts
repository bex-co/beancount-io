import type { DirectiveJson, LedgerOptions } from "@rustledger/wasm";
import { buildEntryIdMap } from "../../entry-hash";
import { linkDocuments } from "../link-documents";
import { seedDirectiveSourceIds } from "../provenance";

const OPTS = {} as LedgerOptions;
const CTX = { today: "2020-01-01" };

function doc(account: string, path: string): DirectiveJson {
  return {
    type: "document",
    date: "2020-01-05",
    account,
    path,
  } as DirectiveJson;
}

function txn(meta: Record<string, string>, accounts: string[]): DirectiveJson {
  return {
    type: "transaction",
    date: "2020-01-10",
    flag: "*",
    narration: "payment",
    tags: [],
    links: [],
    meta,
    postings: accounts.map((account) => ({
      account,
      units: { number: "1.00", currency: "USD" },
    })),
  } as DirectiveJson;
}

describe("linkDocuments", () => {
  it("links a document to an entry by basename + account overlap", () => {
    const d = doc("Assets:Bank", "documents/Assets/Bank/receipt.pdf");
    const t = txn({ document: "receipt.pdf" }, [
      "Assets:Bank",
      "Expenses:Food",
    ]);
    const { directives, errors } = linkDocuments([d, t], OPTS, CTX);

    expect(errors).toEqual([]);
    const linkedDoc = directives[0] as Extract<
      DirectiveJson,
      { type: "document" }
    >;
    expect(linkedDoc.links).toEqual(["dok-2020-01-10"]);
    expect(linkedDoc.tags).toEqual(["linked"]);
    const linkedTxn = directives[1] as Extract<
      DirectiveJson,
      { type: "transaction" }
    >;
    expect(linkedTxn.links).toEqual(["dok-2020-01-10"]);
  });

  it("warns (does not error out) when a referenced document is not found", () => {
    const t = txn({ document: "missing.pdf" }, ["Assets:Bank"]);
    const { directives, errors } = linkDocuments([t], OPTS, CTX);
    expect(directives).toEqual([t]);
    expect(errors).toHaveLength(1);
    expect(errors[0].severity).toBe("warning");
    expect(errors[0].message).toMatch(/Document not found: 'missing\.pdf'/);
  });

  it("does not match a document whose account is not one of the entry's accounts", () => {
    const d = doc("Assets:Other", "receipt.pdf");
    const t = txn({ document: "receipt.pdf" }, [
      "Assets:Bank",
      "Expenses:Food",
    ]);
    const ids = buildEntryIdMap([d, t]);
    seedDirectiveSourceIds(
      [d, t],
      new Map([
        [ids.get(d)!, { filename: "documents/docs.bean", lineno: 1 }],
        [ids.get(t)!, { filename: "transactions.bean", lineno: 1 }],
      ]),
    );
    const { errors } = linkDocuments([d, t], OPTS, CTX);
    expect(errors[0].message).toMatch(/Document not found/);
  });

  it("links multiple document* metadata keys", () => {
    const a = doc("Assets:Bank", "a.pdf");
    const b = doc("Assets:Bank", "b.pdf");
    const t = txn({ document: "a.pdf", "document-2": "b.pdf" }, [
      "Assets:Bank",
    ]);
    const { directives, errors } = linkDocuments([a, b, t], OPTS, CTX);
    expect(errors).toEqual([]);
    expect(
      (directives[0] as Extract<DirectiveJson, { type: "document" }>).tags,
    ).toEqual(["linked"]);
    expect(
      (directives[1] as Extract<DirectiveJson, { type: "document" }>).tags,
    ).toEqual(["linked"]);
  });

  it("adds the reverse link to a document directive that references a document", () => {
    const receipt = doc("Assets:Bank", "receipt.pdf");
    const statement = {
      ...doc("Assets:Bank", "statement.pdf"),
      meta: { document: "receipt.pdf" },
    } as DirectiveJson;
    const { directives, errors } = linkDocuments(
      [receipt, statement],
      OPTS,
      CTX,
    );

    expect(errors).toEqual([]);
    expect(
      (directives[0] as Extract<DirectiveJson, { type: "document" }>).links,
    ).toEqual(["dok-2020-01-05"]);
    expect(
      (directives[1] as Extract<DirectiveJson, { type: "document" }>).links,
    ).toEqual(["dok-2020-01-05"]);
  });

  it("de-duplicates links/tags (addToSet) when a document is linked twice", () => {
    const d = doc("Assets:Bank", "receipt.pdf");
    const t1 = txn({ document: "receipt.pdf" }, ["Assets:Bank"]);
    const t2 = {
      ...(txn({ document: "receipt.pdf" }, ["Assets:Bank"]) as Extract<
        DirectiveJson,
        { type: "transaction" }
      >),
      date: "2020-01-10", // same date -> same link -> deduped on the doc
    } as DirectiveJson;
    const { directives } = linkDocuments([d, t1, t2], OPTS, CTX);
    const linkedDoc = directives[0] as Extract<
      DirectiveJson,
      { type: "document" }
    >;
    expect(linkedDoc.links).toEqual(["dok-2020-01-10"]); // single, not duplicated
  });

  it("ignores entries without document* metadata", () => {
    const d = doc("Assets:Bank", "receipt.pdf");
    const t = txn({ note: "no docs here" }, ["Assets:Bank"]);
    const { directives, errors } = linkDocuments([d, t], OPTS, CTX);
    expect(errors).toEqual([]);
    expect(
      (directives[0] as Extract<DirectiveJson, { type: "document" }>).links,
    ).toBeUndefined();
  });

  it("uses source-relative paths instead of broadening them to a basename", () => {
    const first = doc("Assets:Bank", "receipts/receipt.pdf");
    const second = doc("Assets:Bank", "receipts/receipt.pdf");
    const t = txn({ document: "receipts/receipt.pdf" }, ["Assets:Bank"]);
    const input = [first, second, t];
    const ids = buildEntryIdMap(input);
    seedDirectiveSourceIds(
      input,
      new Map([
        [ids.get(first)!, { filename: "a/documents.bean", lineno: 1 }],
        [ids.get(second)!, { filename: "b/documents.bean", lineno: 1 }],
        [ids.get(t)!, { filename: "a/transactions.bean", lineno: 1 }],
      ]),
    );

    const { directives, errors } = linkDocuments(input, OPTS, CTX);

    expect(errors).toEqual([]);
    expect(
      (directives[0] as Extract<DirectiveJson, { type: "document" }>).links,
    ).toEqual(["dok-2020-01-10"]);
    expect(
      (directives[1] as Extract<DirectiveJson, { type: "document" }>).links,
    ).toBeUndefined();
  });

  it("does not match a path-valued reference by basename without provenance", () => {
    const d = doc("Assets:Bank", "elsewhere/receipt.pdf");
    const t = txn({ document: "receipts/receipt.pdf" }, ["Assets:Bank"]);

    const { directives, errors } = linkDocuments([d, t], OPTS, CTX);

    expect(errors).toHaveLength(1);
    expect(
      (directives[0] as Extract<DirectiveJson, { type: "document" }>).links,
    ).toBeUndefined();
  });
});
