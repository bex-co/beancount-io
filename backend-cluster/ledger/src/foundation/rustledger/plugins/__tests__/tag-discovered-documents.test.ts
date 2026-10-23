import type { DirectiveJson, LedgerOptions } from "@rustledger/wasm";
import { isGeneratedDirective, markGeneratedDirective } from "../provenance";
import { tagDiscoveredDocuments } from "../tag-discovered-documents";

const OPTS = {} as LedgerOptions;
const CTX = { today: "2020-01-01" };
const document = (path: string): DirectiveJson => ({
  type: "document",
  date: "2020-01-05",
  account: "Assets:Bank",
  path,
  tags: ["bank"],
});

describe("tagDiscoveredDocuments", () => {
  it("tags the documents discovery made, and only those (w21/738)", () => {
    const written = document("receipt.pdf");
    const discovered = document("documents/Assets/Bank/2020-01-05.pdf");
    markGeneratedDirective(discovered);
    const { directives, errors } = tagDiscoveredDocuments(
      [written, discovered],
      OPTS,
      CTX,
    );
    expect(directives[0]).toBe(written);
    expect(directives[1]).toEqual({
      ...discovered,
      tags: ["bank", "discovered"],
    });
    // Still a document with no source of its own.
    expect(isGeneratedDirective(directives[1]!)).toBe(true);
    expect(errors).toEqual([]);
  });
});
