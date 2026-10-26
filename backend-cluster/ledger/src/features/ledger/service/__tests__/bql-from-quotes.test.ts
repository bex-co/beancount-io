import { unquoteBqlFromTables } from "../bql-from-quotes";

describe("unquoteBqlFromTables", () => {
  it("blanks the quotes around a FROM table name, keeping length", () => {
    const query = 'SELECT count(*) FROM "entries" LIMIT 1';
    const out = unquoteBqlFromTables(query);
    expect(out).toBe("SELECT count(*) FROM  entries  LIMIT 1");
    expect(out.length).toBe(query.length);
  });

  it("matches the FROM keyword case-insensitively", () => {
    expect(unquoteBqlFromTables('select 1 from "prices"')).toBe(
      "select 1 from  prices ",
    );
  });

  it("handles no space between FROM and the quote", () => {
    expect(unquoteBqlFromTables('SELECT 1 FROM"entries"')).toBe(
      "SELECT 1 FROM entries ",
    );
  });

  it("rewrites every quoted FROM, including inside subqueries", () => {
    expect(
      unquoteBqlFromTables(
        'SELECT * FROM (SELECT * FROM "entries" LIMIT 1) LIMIT 1',
      ),
    ).toBe("SELECT * FROM (SELECT * FROM  entries  LIMIT 1) LIMIT 1");
  });

  it("returns an unquoted query unchanged", () => {
    const query = "SELECT count(*) FROM entries LIMIT 1";
    expect(unquoteBqlFromTables(query)).toBe(query);
  });

  it("ignores FROM inside a string literal", () => {
    const query = `SELECT * WHERE narration = 'FROM "entries"' LIMIT 1`;
    expect(unquoteBqlFromTables(query)).toBe(query);
  });

  it("ignores identifier text containing from", () => {
    const query = 'SELECT fromage FROM "entries" LIMIT 1';
    expect(unquoteBqlFromTables(query)).toBe(
      "SELECT fromage FROM  entries  LIMIT 1",
    );
  });

  it("leaves a single-quoted name alone", () => {
    const query = "SELECT count(*) FROM 'entries' LIMIT 1";
    expect(unquoteBqlFromTables(query)).toBe(query);
  });

  it.each([
    'SELECT 1 FROM "entries x" LIMIT 1',
    'SELECT 1 FROM "e-n-t-r-i-e-s" LIMIT 1',
    'SELECT 1 FROM "" LIMIT 1',
  ])("leaves a non-identifier quoted name alone: %s", (query) => {
    expect(unquoteBqlFromTables(query)).toBe(query);
  });

  it("leaves identifier text glued to the closing quote alone", () => {
    const query = 'SELECT 1 FROM "entries"x LIMIT 1';
    expect(unquoteBqlFromTables(query)).toBe(query);
  });

  it("returns an unterminated quote unchanged", () => {
    const query = 'SELECT 1 FROM "entries LIMIT 1';
    expect(unquoteBqlFromTables(query)).toBe(query);
  });

  it("rewrites before a trailing terminator", () => {
    expect(unquoteBqlFromTables('SELECT count(*) FROM "entries";')).toBe(
      "SELECT count(*) FROM  entries ;",
    );
  });
});
