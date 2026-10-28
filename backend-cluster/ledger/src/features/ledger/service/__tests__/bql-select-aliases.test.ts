import { extractSelectAliases } from "../bql-select-aliases";

describe("extractSelectAliases", () => {
  it.each([
    ["SELECT payee AS number FROM postings", [["number", "payee"]]],
    ["SELECT payee AS number, date AS d FROM postings", [["number", "payee"], ["d", "date"]]],
    ["SELECT upper(payee) AS number FROM postings", [["number", "upper"]]],
    ["SELECT number AS number FROM postings", [["number", "number"]]],
    ["SELECT NULL AS number LIMIT 1", [["number", ""]]],
    ["SELECT 1 AS x", [["x", ""]]],
    ["SELECT count(*) AS c FROM postings", [["c", "count"]]],
    ["SELECT -number AS x FROM postings", [["x", "number"]]],
    ["SELECT (payee) AS x FROM postings", [["x", "payee"]]],
    ['SELECT payee AS "Number" FROM postings', [["number", "payee"]]],
    ["SELECT DISTINCT payee AS p FROM postings", [["p", "payee"]]],
    ["SELECT payee as p FROM postings", [["p", "payee"]]],
    ["select Payee As P from postings", [["p", "payee"]]],
    [
      "SELECT (SELECT max(x) AS m FROM t2) AS outer FROM t1",
      [["outer", "select"]],
    ],
    [
      "SELECT a AS x FROM t WHERE b IN (SELECT c AS y FROM u)",
      [["x", "a"]],
    ],
    ["SELECT payee AS p FROM postings GROUP BY p ORDER BY p LIMIT 1", [["p", "payee"]]],
    ["SELECT 'a, b' AS s FROM postings", [["s", ""]]],
    ["SELECT 'number' AS number FROM postings", [["number", ""]]],
    ["SELECT payee AS p /* FROM nowhere */ FROM postings", [["p", "payee"]]],
    ["SELECT /* AS q */ payee AS p FROM postings", [["p", "payee"]]],
    ["SELECT 'AS x' AS s FROM postings", [["s", ""]]],
  ])("extracts %p", (query, expected) => {
    expect([...extractSelectAliases(query)]).toEqual(expected);
  });

  it.each([
    "SELECT payee FROM postings",
    "SELECT payee, number FROM postings",
    "SELECT * FROM postings",
    "SELECT upper(payee) FROM postings",
    "SELECT CAST(x AS INT) FROM postings",
    "SELECT 1",
    ".help",
    "",
    "SELECT payee AS",
    "SELECT payee AS 5, x",
  ])("finds no alias in %p", (query) => {
    expect([...extractSelectAliases(query)]).toEqual([]);
  });

  it("keeps the last root for duplicate aliases", () => {
    expect([
      ...extractSelectAliases("SELECT number AS x, payee AS x FROM postings"),
    ]).toEqual([["x", "payee"]]);
  });
});
