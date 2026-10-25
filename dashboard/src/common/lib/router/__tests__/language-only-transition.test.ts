import { describe, expect, it } from "vitest";
import { isLanguageOnlyTransition } from "../language-only-transition";

const side = (search: Record<string, unknown>) => ({
  routeId: "files/new",
  pathname: "/ledger/o/b/files/new/main",
  params: { ledgerOwner: "o", ledgerName: "b" },
  search,
});

describe("isLanguageOnlyTransition (w4/1088)", () => {
  it("accepts a lang-only change on the same file context", () => {
    expect(
      isLanguageOnlyTransition(side({ lang: "en" }), side({ lang: "de" })),
    ).toBe(true);
    expect(
      isLanguageOnlyTransition(side({}), side({ lang: "de", editMode: true })),
    ).toBe(false);
  });

  it("rejects other search, path, route and param changes", () => {
    expect(
      isLanguageOnlyTransition(
        side({ lang: "en", editMode: true }),
        side({ lang: "de" }),
      ),
    ).toBe(false);
    expect(
      isLanguageOnlyTransition(side({ lang: "en" }), {
        ...side({ lang: "de" }),
        pathname: "/other",
      }),
    ).toBe(false);
    expect(
      isLanguageOnlyTransition(side({ lang: "en" }), {
        ...side({ lang: "de" }),
        params: { ledgerOwner: "x", ledgerName: "b" },
      }),
    ).toBe(false);
    expect(isLanguageOnlyTransition(undefined, side({}))).toBe(false);
  });
});
