import { describe, expect, it } from "vitest";
import {
  BQL_QUERY_SNIPPETS,
  bqlQuerySnippetRange,
  shouldOfferBqlQuerySnippets,
} from "../bql-completion-snippets";

describe("bql query completion snippets", () => {
  it("replaces the typed prefix instead of inserting at the cursor", () => {
    expect(
      bqlQuerySnippetRange(1, {
        word: "sel",
        startColumn: 1,
        endColumn: 4,
      }),
    ).toEqual({
      startLineNumber: 1,
      endLineNumber: 1,
      startColumn: 1,
      endColumn: 4,
    });
  });

  it("offers snippets for an empty line or a lone prefix", () => {
    expect(
      shouldOfferBqlQuerySnippets("", {
        word: "",
        startColumn: 1,
        endColumn: 1,
      }),
    ).toBe(true);
    expect(
      shouldOfferBqlQuerySnippets("sel", {
        word: "sel",
        startColumn: 1,
        endColumn: 4,
      }),
    ).toBe(true);
    expect(
      shouldOfferBqlQuerySnippets("  select  ", {
        word: "select",
        startColumn: 3,
        endColumn: 9,
      }),
    ).toBe(true);
  });

  it("suppresses whole-query snippets inside an existing statement", () => {
    expect(
      shouldOfferBqlQuerySnippets("select * from accounts where sel", {
        word: "sel",
        startColumn: 30,
        endColumn: 33,
      }),
    ).toBe(false);
  });

  it("keeps the four starter snippets", () => {
    expect(BQL_QUERY_SNIPPETS.map((snippet) => snippet.insertText)).toEqual([
      "select * from accounts",
      "select * from entries",
      "select * from transactions",
      "select * from balances",
    ]);
  });
});
