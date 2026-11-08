// eslint-disable-next-line @typescript-eslint/no-require-imports
const { schemaNames } = require("../schema-names.js");

// ENSURE_SCHEMAS lands in a CREATE SCHEMA statement, so the parser is the only
// thing between an environment value and DDL.

describe("schemaNames", () => {
  it("asks for nothing when unset or blank", () => {
    expect(schemaNames(undefined)).toEqual([]);
    expect(schemaNames("")).toEqual([]);
    expect(schemaNames(" , ")).toEqual([]);
  });

  it("splits, trims and de-duplicates", () => {
    expect(schemaNames("gitea, extra ,gitea")).toEqual(["gitea", "extra"]);
  });

  it.each([
    'gitea"; DROP SCHEMA public; --',
    "Gitea",
    "1gitea",
    "git-ea",
    "a".repeat(64),
  ])("refuses %p instead of quoting it", (name) => {
    expect(() => schemaNames(name)).toThrow(/ENSURE_SCHEMAS/);
  });
});
