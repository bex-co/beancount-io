import type { DirectiveJson } from "@rustledger/wasm";
import {
  discoverDocuments,
  mergeDiscoveredDocuments,
} from "../document-discovery";
import { isGeneratedDirective } from "../plugins/provenance";

/**
 * w21/738: `option "documents"` discovery never ran (the engine has no
 * filesystem), so a statement in the documents folder never reached its
 * account. The repository's file list stands in for the disk.
 */
const open = (account: string, date = "2024-01-01"): DirectiveJson => ({
  type: "open",
  date,
  account,
  currencies: [],
});
const OPTION = 'option "documents" "documents"\n';
const discover = (
  paths: string[],
  directives: DirectiveJson[] = [open("Assets:Bank:Checking")],
  source = OPTION,
  entryPoint = "main.beancount",
) => discoverDocuments(directives, source, entryPoint, paths);

describe("discoverDocuments", () => {
  it("makes a document of each dated file in an account's folder", () => {
    const { documents, errors } = discover([
      "main.beancount",
      "documents/Assets/Bank/Checking/2024-02-01.statement.pdf",
      "documents/Assets/Bank/Checking/notes.txt",
      "documents/Assets/Bank/Savings/2024-02-01.pdf",
      "documents/Assets/Bank/2024-03-01.pdf",
      "receipts/Assets/Bank/Checking/2024-04-01.pdf",
    ]);
    expect(errors).toEqual([]);
    // Undated files, unnamed accounts and other folders are left out.
    expect(documents).toEqual([
      {
        type: "document",
        date: "2024-02-01",
        account: "Assets:Bank:Checking",
        path: "documents/Assets/Bank/Checking/2024-02-01.statement.pdf",
      },
    ]);
    // No source text: nothing to edit or delete.
    expect(isGeneratedDirective(documents[0]!)).toBe(true);
  });

  it("resolves the folder against the entry point's directory, every root", () => {
    const { documents } = discover(
      [
        "books/documents/Assets/Bank/Checking/2024-02-01.pdf",
        "books/scans/Assets/Bank/Checking/2024-02-02.pdf",
        "documents/Assets/Bank/Checking/2024-02-03.pdf",
      ],
      undefined,
      'option "documents" "documents"\noption "documents" "./scans/"\n',
      "books/main.beancount",
    );
    expect(documents.map((document) => document.date)).toEqual([
      "2024-02-01",
      "2024-02-02",
    ]);
  });

  it("raises Beancount's error for a date that does not exist", () => {
    const { documents, errors } = discover([
      "documents/Assets/Bank/Checking/0000-01-01.statement.pdf",
      "documents/Assets/Bank/Checking/2024-02-30.statement.pdf",
      "documents/Assets/Bank/Checking/2024-13-01.statement.pdf",
    ]);
    expect(documents).toEqual([]);
    // bean-check 3.2.3's words.
    expect(errors.map((error) => [error.file, error.message])).toEqual([
      [
        "main.beancount",
        "Invalid date on document file '0000-01-01.statement.pdf': year 0 is out of range",
      ],
      [
        "main.beancount",
        "Invalid date on document file '2024-02-30.statement.pdf': day is out of range for month",
      ],
      [
        "main.beancount",
        "Invalid date on document file '2024-13-01.statement.pdf': month must be in 1..12",
      ],
    ]);
  });

  it("does nothing without the option or the repository's file list", () => {
    const path = ["documents/Assets/Bank/Checking/2024-02-01.pdf"];
    expect(discover(path, undefined, "").documents).toEqual([]);
    expect(
      discoverDocuments(
        [open("Assets:Bank:Checking")],
        OPTION,
        "main.beancount",
        undefined,
      ).documents,
    ).toEqual([]);
  });
});

describe("mergeDiscoveredDocuments", () => {
  it("places a discovered document where Beancount sorts it", () => {
    const written: DirectiveJson = {
      type: "document",
      date: "2024-02-01",
      account: "Assets:Bank:Checking",
      path: "receipt.pdf",
    };
    const close: DirectiveJson = {
      type: "close",
      date: "2024-02-01",
      account: "Assets:Bank:Checking",
    };
    const transaction: DirectiveJson = {
      type: "transaction",
      date: "2024-02-01",
      flag: "*",
      narration: "",
      tags: [],
      links: [],
      postings: [],
    };
    const later = open("Assets:Other", "2024-03-01");
    const { documents } = discover([
      "documents/Assets/Bank/Checking/2024-02-01.pdf",
    ]);
    const merged = mergeDiscoveredDocuments(
      [open("Assets:Bank:Checking"), transaction, written, close, later],
      documents,
    );
    // After the day's entries, before its written documents and closes.
    expect(merged.map((directive) => directive.type)).toEqual([
      "open",
      "transaction",
      "document",
      "document",
      "close",
      "open",
    ]);
    expect(merged[2]).toBe(documents[0]);
  });
});
