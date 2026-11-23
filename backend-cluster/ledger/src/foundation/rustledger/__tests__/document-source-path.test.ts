/**
 * A Document's relative path names a file beside the source file that
 * declares it. The report used to copy the raw path, so `document … "receipt.txt"`
 * in `books/documents.bean` linked to a root `receipt.txt` that does not exist
 * (w4/301). The real-WASM parse and worker clone are covered by
 * `yarn verify:rustledger`; these cases pin the resolution and the provenance
 * round trip across a structured clone.
 */
import type { DirectiveJson } from "@rustledger/wasm";
import { collectDocuments } from "../directives-report";
import { documentFilePath } from "../document-validation";
import { buildEntryIdMap } from "../entry-hash";
import { serializeDirective } from "../journal-serialize";
import {
  captureDirectiveSourceLocations,
  restoreDirectiveSourceLocations,
  seedDirectiveSourceIds,
  type DirectiveSourceLocation,
} from "../plugins/provenance";
import { serialiseV1Directive } from "@/features/ledger/service/ledger-legacy-journal";

type Document = Extract<DirectiveJson, { type: "document" }>;

const document = (date: string, path: string): Document => ({
  type: "document",
  date,
  account: "Assets:Cash",
  path,
  tags: [],
  links: [],
});

/** Parsed directives with their declaring files, as the source probe seeds them. */
function parsed(entries: Array<[Document, string]>): Document[] {
  const directives = entries.map(([directive]) => directive);
  const ids = buildEntryIdMap(directives);
  const locations = new Map<string, DirectiveSourceLocation>(
    entries.map(([directive, filename], index) => [
      ids.get(directive)!,
      { filename, lineno: index + 1 },
    ]),
  );
  seedDirectiveSourceIds(directives, locations);
  return directives;
}

describe("Document paths resolve against their declaring file", () => {
  const ledger = () =>
    parsed([
      [document("2026-10-19", "books/receipt.txt"), "main.bean"],
      [document("2026-10-21", "receipt.txt"), "books/documents.bean"],
      [document("2026-10-22", "receipt.txt"), "other/documents.bean"],
      [document("2026-10-23", "../shared/scan.pdf"), "books/documents.bean"],
    ]);

  it("names repository-relative files for root and included sources", () => {
    expect(collectDocuments(ledger()).map((entry) => entry.path)).toEqual([
      "books/receipt.txt",
      "books/receipt.txt",
      "other/receipt.txt",
      "shared/scan.pdf",
    ]);
  });

  it("keeps the same answer after a worker structured clone", () => {
    const original = ledger();
    const locations = captureDirectiveSourceLocations(original);
    const cloned = structuredClone(original);
    // A fresh object carries no provenance until it is restored.
    expect(documentFilePath(cloned[1]!)).toBe("receipt.txt");

    restoreDirectiveSourceLocations(cloned, locations);
    expect(cloned.map(documentFilePath)).toEqual([
      "books/receipt.txt",
      "books/receipt.txt",
      "other/receipt.txt",
      "shared/scan.pdf",
    ]);
  });

  it("leaves absolute paths and unknown sources as written", () => {
    const [absolute] = parsed([
      [
        document("2026-10-21", "/srv/scans/receipt.txt"),
        "books/documents.bean",
      ],
    ]);
    expect(documentFilePath(absolute!)).toBe("/srv/scans/receipt.txt");
    expect(documentFilePath(document("2026-10-21", "receipt.txt"))).toBe(
      "receipt.txt",
    );
  });

  it("gives the legacy journal the same filename", () => {
    const [, included] = ledger();
    expect(serialiseV1Directive(included!)).toMatchObject({
      type: "Document",
      filename: "books/receipt.txt",
    });
  });

  it("gives structured journal reads the same repository-relative filenames", () => {
    const directives = ledger();
    expect(directives.map(serializeDocument)).toEqual(
      collectDocuments(directives).map((entry) => entry.path),
    );
  });
});

function serializeDocument(directive: Document): string {
  const item = serializeDirective(directive);
  if (!("filename" in item)) throw new Error("Expected a journal document");
  return item.filename;
}
