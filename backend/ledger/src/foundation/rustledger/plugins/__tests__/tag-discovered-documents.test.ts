import type { DirectiveJson, LedgerOptions } from "@rustledger/wasm";
import { tagDiscoveredDocuments } from "../tag-discovered-documents";

const OPTS = {} as LedgerOptions;
const CTX = { today: "2020-01-01" };

describe("tagDiscoveredDocuments", () => {
  it("is a no-op (no discovered-document signal exists in the WASM engine)", () => {
    const document: DirectiveJson = {
      type: "document",
      date: "2020-01-05",
      account: "Assets:Bank",
      path: "documents/receipt.pdf",
    } as DirectiveJson;
    const input = [document];
    const { directives, errors } = tagDiscoveredDocuments(input, OPTS, CTX);
    // Returns the stream unchanged — no `#discovered` tag can be inferred without
    // per-directive lineno / filesystem auto-discovery.
    expect(directives).toBe(input);
    expect(directives).toEqual([document]);
    expect(errors).toEqual([]);
  });
});
