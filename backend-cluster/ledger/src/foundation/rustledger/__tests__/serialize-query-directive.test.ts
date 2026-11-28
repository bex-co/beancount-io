import type { DirectiveJson } from "@rustledger/wasm";
import { CustomSubtype, DirectiveType } from "@/foundation/ledger-api-types";
import {
  directiveToText,
  matchesJournalDisplayFilters,
  serializeDirective,
} from "../journal-serialize";

// w31/145: a stored query is listed as a `Query`, as Fava's journal lists it
// and as the entries count counts it, not as a custom directive named after it.
const query = (name = "qa-q"): DirectiveJson => ({
  type: "query",
  date: "2026-01-05",
  name,
  query_string: "SELECT account WHERE account ~ 'Cash'",
});

describe("serializeDirective of a query directive", () => {
  it("is a Query item with its name and query string", () => {
    const { entry_hash, ...rest } = serializeDirective(query());
    expect(entry_hash).toMatch(/^[0-9a-f]{32}$/);
    expect(rest).toEqual({
      directive_type: "Query",
      date: "2026-01-05",
      meta: null,
      name: "qa-q",
      query_string: "SELECT account WHERE account ~ 'Cash'",
    });
  });

  it("has no custom-directive fields", () => {
    const item = serializeDirective(query());
    expect("type" in item).toBe(false);
    expect("values" in item).toBe(false);
  });

  it("keeps its user metadata", () => {
    expect(
      serializeDirective({ ...query(), meta: { owner: "ops" } }).meta,
    ).toEqual({ owner: "ops" });
  });

  it("still writes back as the query line it was read from", () => {
    expect(directiveToText(query())).toBe(
      `2026-01-05 query "qa-q" "SELECT account WHERE account ~ 'Cash'"\n`,
    );
  });
});

describe("journal filters on a query directive", () => {
  const item = () => serializeDirective(query());

  it("is selected by directiveTypes Query and not by Custom", () => {
    expect(
      matchesJournalDisplayFilters(item(), {
        directiveTypes: [DirectiveType.Query],
      }),
    ).toBe(true);
    expect(
      matchesJournalDisplayFilters(item(), {
        directiveTypes: [DirectiveType.Custom],
      }),
    ).toBe(false);
  });

  it("is not a budget, even when the query is named budget", () => {
    expect(
      matchesJournalDisplayFilters(serializeDirective(query("budget")), {
        directiveTypes: [DirectiveType.Custom],
        customSubtypes: [CustomSubtype.Budget],
      }),
    ).toBe(false);
  });
});
