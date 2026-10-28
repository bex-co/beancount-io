import { routeIntegerLiterals } from "../bql-int-literals";

describe("routeIntegerLiterals", () => {
  it.each([
    ["SELECT 9007199254740992", "SELECT decimal('9007199254740992')"],
    ["SELECT 9223372036854775807", "SELECT decimal('9223372036854775807')"],
    ["SELECT -9007199254740992", "SELECT -decimal('9007199254740992')"],
    ["SELECT - 9007199254740992", "SELECT - decimal('9007199254740992')"],
    ["SELECT 5 - 9007199254740992", "SELECT 5 - decimal('9007199254740992')"],
    [
      "SELECT count(*) FROM postings WHERE number = 9007199254740992",
      "SELECT count(*) FROM postings WHERE number = decimal('9007199254740992')",
    ],
    [
      "SELECT 9223372036854775807, 'x'",
      "SELECT decimal('9223372036854775807'), 'x'",
    ],
    [
      "SELECT int('9007199254740992')",
      "SELECT decimal('9007199254740992')",
    ],
    [
      "SELECT int('-9007199254740992')",
      "SELECT decimal('-9007199254740992')",
    ],
    [
      "SELECT int('+9007199254740992')",
      "SELECT decimal('9007199254740992')",
    ],
    [
      'SELECT int("9007199254740992")',
      "SELECT decimal('9007199254740992')",
    ],
    ["SELECT int(9007199254740992)", "SELECT decimal('9007199254740992')"],
    ["SELECT int(-9007199254740992)", "SELECT decimal('-9007199254740992')"],
    ["SELECT -int(9007199254740992)", "SELECT -decimal('9007199254740992')"],
    [
      "SELECT int( '9007199254740992' )",
      "SELECT decimal('9007199254740992')",
    ],
    [
      "SELECT INT('9007199254740992')",
      "SELECT decimal('9007199254740992')",
    ],
  ])("routes %p through decimal()", (query, expected) => {
    expect(routeIntegerLiterals(query)).toBe(expected);
  });

  it.each([
    ["SELECT * FROM postings LIMIT 4294967296", "SELECT * FROM postings LIMIT 2147483647"],
    ["SELECT * FROM postings LIMIT 4294967297", "SELECT * FROM postings LIMIT 2147483647"],
    ["SELECT * FROM postings LIMIT 9223372036854775807", "SELECT * FROM postings LIMIT 2147483647"],
    ["SELECT * FROM postings LIMIT 9007199254740992", "SELECT * FROM postings LIMIT 2147483647"],
    [
      "SELECT * FROM postings LIMIT 79228162514264337593543950336",
      "SELECT * FROM postings LIMIT 2147483647",
    ],
    ["select * from postings limit 4294967296", "select * from postings limit 2147483647"],
    [
      "SELECT count(*) FROM (SELECT * FROM postings LIMIT 4294967297)",
      "SELECT count(*) FROM (SELECT * FROM postings LIMIT 2147483647)",
    ],
  ])("caps %p", (query, expected) => {
    expect(routeIntegerLiterals(query)).toBe(expected);
  });

  it.each([
    "SELECT 9007199254740991",
    "SELECT 5",
    "SELECT 0",
    "SELECT 007",
    "SELECT 9223372036854775808",
    "SELECT 79228162514264337593543950335",
    "SELECT 79228162514264337593543950336",
    "SELECT 1.5",
    "SELECT '9007199254740992'",
    'SELECT "9007199254740992"',
    "SELECT q9007199254740992 FROM postings",
    "SELECT 9007199254740992x FROM postings",
    "SELECT a.9007199254740992 FROM postings",
    "SELECT 1e5",
    "SELECT 9007199254740992e0",
    "SELECT 1_000",
    "SELECT int('5')",
    "SELECT int('9223372036854775808')",
    "SELECT int(5)",
    "SELECT int(1.5)",
    "SELECT int('')",
    "SELECT int()",
    "SELECT int('5', 6)",
    "SELECT int(' 5')",
    "SELECT point('5')",
    "SELECT 1 AS int",
    "SELECT 1 AS int(2)",
    "SELECT a.int('9007199254740992') FROM postings",
    "SELECT * FROM postings LIMIT 5",
    "SELECT * FROM postings LIMIT 2147483647",
    "SELECT * FROM postings LIMIT 4294967295",
    "SELECT * FROM postings LIMIT 0",
    "SELECT * FROM postings LIMIT -5",
    "SELECT * FROM postings LIMIT 2.5",
    "SELECT * FROM postings LIMIT 5x",
    "SELECT * FROM postings LIMIT 4294967296x",
    "SELECT payee, count(*) FROM postings GROUP BY 9007199254740992",
    "SELECT payee, count(*) FROM postings GROUP BY payee, 9007199254740992",
    "SELECT payee, count(*) FROM postings GROUP BY 9007199254740992, 9007199254740992",
    "SELECT * FROM postings ORDER BY 9007199254740992",
    "SELECT * FROM postings ORDER BY 9007199254740992, 1",
  ])("leaves %p alone", (query) => {
    expect(routeIntegerLiterals(query)).toBe(query);
  });

  it("rewrites expression keys under GROUP BY", () => {
    expect(
      routeIntegerLiterals(
        "SELECT count(*) FROM postings GROUP BY number + 9007199254740992",
      ),
    ).toBe(
      "SELECT count(*) FROM postings GROUP BY number + decimal('9007199254740992')",
    );
  });

  it("returns an unterminated literal unchanged", () => {
    const query = "SELECT 9007199254740992 WHERE narration = 'oops";
    expect(routeIntegerLiterals(query)).toBe(query);
  });
});
