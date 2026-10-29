import { stripBqlStatementTerminator } from "../bql-terminator";

describe("stripBqlStatementTerminator", () => {
  it("replaces a trailing semicolon with a space, keeping length", () => {
    const query = "SELECT count(*) FROM postings;";
    const out = stripBqlStatementTerminator(query);
    expect(out).toBe("SELECT count(*) FROM postings ");
    expect(out.length).toBe(query.length);
  });

  it("strips a terminator followed by trailing whitespace", () => {
    expect(stripBqlStatementTerminator("SELECT 1;  \n")).toBe("SELECT 1   \n");
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
    ["SELECT payee FROM postings;;", "SELECT payee FROM postings  "],
    ["SELECT payee FROM postings ;;", "SELECT payee FROM postings   "],
    ["SELECT payee FROM postings; ;", "SELECT payee FROM postings   "],
    ["SELECT payee FROM postings;;;", "SELECT payee FROM postings   "],
    ["SELECT 1; /* gap */ ;", "SELECT 1" + " ".repeat(13)],
    ["SELECT 1; SELECT 2;;", "SELECT 1; SELECT 2  "],
  ])(
    "neutralizes a run of trailing terminators, keeping length: %p (w23/199)",
    (query, expected) => {
      const out = stripBqlStatementTerminator(query);
      expect(out).toBe(expected);
      expect(out.length).toBe(query.length);
    },
  );

  it("keeps a real statement between terminators", () => {
    const query = "SELECT 1; SELECT 2 FROM postings;; ";
    expect(stripBqlStatementTerminator(query)).toBe(
      "SELECT 1; SELECT 2 FROM postings   ",
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

  // w23/151: trailing comments ride along, keeping length — the tail past
  // the last unquoted `;` may hold `--` and `/* */` besides whitespace.
  it.each([
    ["SELECT 1; -- trailing", "SELECT 1" + " ".repeat(13)],
    ["SELECT 1;-- trailing", "SELECT 1 " + " ".repeat(11)],
    [
      "SELECT 1; -- one\n-- two",
      "SELECT 1 " + " ".repeat(7) + "\n" + " ".repeat(6),
    ],
    ["SELECT 1; /* trailing */", "SELECT 1" + " ".repeat(16)],
    ["SELECT 1; -- don't", "SELECT 1" + " ".repeat(10)],
    ["SELECT 1; -- foo; bar", "SELECT 1" + " ".repeat(13)],
  ])(
    "neutralizes a terminator with a trailing comment: %s",
    (query, expected) => {
      const out = stripBqlStatementTerminator(query);
      expect(out).toBe(expected);
      expect(out.length).toBe(query.length);
    },
  );

  // w23/151: the load-bearing half — a second statement, garbage, or a
  // bare `--x` still returns unchanged for the engine to refuse loudly.
  it.each([
    "SELECT 1; SELECT 2",
    "SELECT 1; GARBAGE!!!",
    "SELECT 1; --x",
    "SELECT 1; -- ok\nSELECT 2",
    "SELECT 1; /* unterminated",
  ])("leaves a non-comment tail for the engine: %s", (query) => {
    expect(stripBqlStatementTerminator(query)).toBe(query);
  });

  it("neutralizes only the final semicolon before a trailing comment", () => {
    // The mid-query `;` still reaches the engine, so the second
    // statement refuses loudly (w23/151).
    expect(stripBqlStatementTerminator("SELECT 1; SELECT 2; -- trailing")).toBe(
      "SELECT 1; SELECT 2" + " ".repeat(13),
    );
  });
});
