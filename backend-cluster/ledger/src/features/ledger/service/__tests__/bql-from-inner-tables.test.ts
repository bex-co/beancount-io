import { rescueInnerTableFrom } from "../bql-from-inner-tables";

describe("rescueInnerTableFrom", () => {
  it.each([
    "postings",
    "entries",
    "prices",
    "nosuch",
    "close",
    "clear",
    "ACCOUNTS",
  ])("inserts WHERE true after inner bare %s", (name) => {
    expect(
      rescueInnerTableFrom(`SELECT count(*) FROM (SELECT * FROM ${name})`),
    ).toBe(`SELECT count(*) FROM (SELECT * FROM ${name} WHERE true)`);
  });

  it("rescues at nesting depth 2", () => {
    expect(
      rescueInnerTableFrom(
        "SELECT count(*) FROM (SELECT * FROM (SELECT * FROM postings))",
      ),
    ).toBe(
      "SELECT count(*) FROM (SELECT * FROM (SELECT * FROM postings WHERE true))",
    );
  });

  it("matches the FROM keyword case-insensitively", () => {
    expect(
      rescueInnerTableFrom("select count(*) from (select * from postings)"),
    ).toBe("select count(*) from (select * from postings WHERE true)");
  });

  it("rescues past whitespace before the paren", () => {
    expect(
      rescueInnerTableFrom("SELECT count(*) FROM (SELECT * FROM postings  )"),
    ).toBe("SELECT count(*) FROM (SELECT * FROM postings WHERE true  )");
  });

  it("rescues the inner table under outer clauses", () => {
    expect(
      rescueInnerTableFrom(
        "SELECT * FROM (SELECT * FROM postings) WHERE date > 2020-01-01 LIMIT 1",
      ),
    ).toBe(
      "SELECT * FROM (SELECT * FROM postings WHERE true) WHERE date > 2020-01-01 LIMIT 1",
    );
  });

  it.each([
    // Fold columns rely on the native `)`-fold.
    "payee",
    "narration",
    "type",
    // The dual folds, matching stock.
    "accounts",
  ])("leaves inner bare %s alone", (name) => {
    const query = `SELECT count(*) FROM (SELECT * FROM ${name})`;
    expect(rescueInnerTableFrom(query)).toBe(query);
  });

  it.each([
    "SELECT count(*) FROM postings",
    "SELECT count(*) FROM postings LIMIT 1",
    "SELECT count(*) FROM (SELECT * FROM postings LIMIT 5)",
    "SELECT count(*) FROM (SELECT * FROM postings WHERE date > 2020-01-01)",
    // Quoted names are the unquote stage's job, which runs first.
    'SELECT count(*) FROM (SELECT * FROM "postings")',
  ])("leaves %s alone", (query) => {
    expect(rescueInnerTableFrom(query)).toBe(query);
  });

  it("ignores FROM inside a string literal", () => {
    const query = "SELECT * FROM (SELECT * WHERE narration = 'FROM postings)') LIMIT 1";
    expect(rescueInnerTableFrom(query)).toBe(query);
  });

  it("returns an unterminated literal unchanged", () => {
    const query = "SELECT * FROM (SELECT * FROM postings WHERE narration = 'oops)";
    expect(rescueInnerTableFrom(query)).toBe(query);
  });
});
