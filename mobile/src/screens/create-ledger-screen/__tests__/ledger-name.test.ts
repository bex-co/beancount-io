import {
  classifyCreateLedgerError,
  generateDefaultLedgerName,
  ledgerSlugPreview,
  slugifyLedgerName,
} from "../ledger-name";

describe("slugifyLedgerName", () => {
  it("lowercases, replaces spaces, and strips invalid characters", () => {
    expect(slugifyLedgerName("My Book!")).toBe("my-book");
    expect(slugifyLedgerName("  Hello__World  ")).toBe("hello__world");
    expect(slugifyLedgerName("---")).toBe("");
  });
});

describe("ledgerSlugPreview", () => {
  it("previews a name the slugifier changes", () => {
    expect(ledgerSlugPreview("My Book!")).toBe("my-book");
  });

  it("shows nothing when the name needs no change", () => {
    expect(ledgerSlugPreview("my-book")).toBe(null);
    expect(ledgerSlugPreview("")).toBe(null);
  });

  it("shows nothing when the name slugifies away, instead of a dangling hint", () => {
    expect(ledgerSlugPreview("!!!")).toBe(null);
    expect(ledgerSlugPreview("---")).toBe(null);
    expect(ledgerSlugPreview("@@@")).toBe(null);
  });
});

describe("generateDefaultLedgerName", () => {
  it("starts at my-book and increments past collisions", () => {
    expect(generateDefaultLedgerName([])).toBe("my-book");
    expect(generateDefaultLedgerName(["my-book"])).toBe("my-book-1");
    expect(generateDefaultLedgerName(["my-book", "my-book-1"])).toBe(
      "my-book-2",
    );
  });
});

describe("classifyCreateLedgerError", () => {
  it("maps name conflicts and tier limits", () => {
    expect(
      classifyCreateLedgerError(
        new Error("A ledger with the name 'x' already exists."),
      ),
    ).toBe("conflict");
    expect(
      classifyCreateLedgerError({
        graphQLErrors: [{ extensions: { code: "RESOURCE_LIMIT_REACHED" } }],
      }),
    ).toBe("tier");
    expect(classifyCreateLedgerError(new Error("network down"))).toBe("other");
  });
});

describe("Sample-only template payload", () => {
  it("omits template for Starter and sends SAMPLE for Sample", () => {
    const buildVariables = (template: "STARTER" | "SAMPLE") => ({
      name: "my-book",
      private: true,
      ...(template === "SAMPLE" ? { template: "SAMPLE" } : {}),
    });
    expect(buildVariables("STARTER")).toEqual({
      name: "my-book",
      private: true,
    });
    expect(buildVariables("SAMPLE")).toEqual({
      name: "my-book",
      private: true,
      template: "SAMPLE",
    });
  });
});
