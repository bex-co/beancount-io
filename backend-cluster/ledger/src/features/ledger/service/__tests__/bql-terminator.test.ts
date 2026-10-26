import { stripBqlStatementTerminator } from "../bql-terminator";

describe("stripBqlStatementTerminator", () => {
  it("replaces a trailing semicolon with a space, keeping length", () => {
    const query = "SELECT count(*) FROM postings;";
    const out = stripBqlStatementTerminator(query);
    expect(out).toBe("SELECT count(*) FROM postings ");
    expect(out.length).toBe(query.length);
  });

  it("strips a terminator followed by trailing whitespace", () => {
    expect(stripBqlStatementTerminator("SELECT 1;  \n")).toBe(
      "SELECT 1   \n",
    );
  });

  it("returns a semicolon-less query unchanged", () => {
    const query = "SELECT count(*) FROM postings";
    expect(stripBqlStatementTerminator(query)).toBe(query);
  });

  it("leaves a mid-query semicolon for the engine to report", () => {
    const query = "SELECT 1; SELECT 2";
    expect(stripBqlStatementTerminator(query)).toBe(query);
  });

  it("strips only the final semicolon of a multi-statement query", () => {
    expect(stripBqlStatementTerminator("SELECT 1; SELECT 2;")).toBe(
      "SELECT 1; SELECT 2 ",
    );
  });

  it.each([
    "SELECT ';' AS semi LIMIT 1",
    'SELECT ";" AS semi LIMIT 1',
    "SELECT payee WHERE narration = 'done; ok' LIMIT 1",
  ])("leaves a semicolon inside a string literal alone: %s", (query) => {
    expect(stripBqlStatementTerminator(query)).toBe(query);
  });

  it("strips the terminator around a quoted semicolon", () => {
    expect(stripBqlStatementTerminator("SELECT ';' AS semi LIMIT 1;")).toBe(
      "SELECT ';' AS semi LIMIT 1 ",
    );
  });

  it("returns an unterminated string literal unchanged", () => {
    const query = "SELECT 'oops;";
    expect(stripBqlStatementTerminator(query)).toBe(query);
  });

  it("neutralizes a lone semicolon to whitespace", () => {
    expect(stripBqlStatementTerminator(";")).toBe(" ");
  });
});
