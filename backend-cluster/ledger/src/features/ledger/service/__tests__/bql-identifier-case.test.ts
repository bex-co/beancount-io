import { foldBqlIdentifierCase as fold } from "../bql-identifier-case";

describe("foldBqlIdentifierCase (w23/176)", () => {
  it.each([
    ["SELECT PAYEE LIMIT 1", "SELECT payee LIMIT 1"],
    ["SELECT Payee WHERE Account = 'x'", "SELECT payee WHERE account = 'x'"],
    ["SELECT upper(PAYEE)", "SELECT upper(payee)"],
  ])("lowercases unquoted column names: %s", (input, expected) => {
    expect(fold(input)).toBe(expected);
  });

  it("leaves keywords and function names in the user's spelling", () => {
    expect(fold("Select COUNT(*) From Postings Where Payee Is Not Null")).toBe(
      "Select COUNT(*) From postings Where payee Is Not Null",
    );
  });

  it("leaves string literals, including quoted lookalikes, untouched", () => {
    expect(
      fold("SELECT count(*) WHERE PAYEE = 'VISA Corp' AND x = \"Y\""),
    ).toBe("SELECT count(*) WHERE payee = 'VISA Corp' AND x = \"Y\"");
  });

  it("leaves block comments and numeric tokens untouched", () => {
    expect(fold("SELECT /* KEEP Me */ 1E5, 2026-01-01")).toBe(
      "SELECT /* KEEP Me */ 1E5, 2026-01-01",
    );
  });

  it("keeps an alias declaration's spelling and resolves mixed-case references to it in ORDER BY", () => {
    expect(fold("SELECT PAYEE AS Total ORDER BY TOTAL")).toBe(
      "SELECT payee AS Total ORDER BY Total",
    );
    expect(fold("SELECT payee AS P ORDER BY P")).toBe(
      "SELECT payee AS P ORDER BY P",
    );
  });

  it("does not repoint a WHERE reference at an alias, nor touch already-lowercase words", () => {
    expect(fold("SELECT account AS Account WHERE ACCOUNT = 'a'")).toBe(
      "SELECT account AS Account WHERE account = 'a'",
    );
    expect(fold("select account as Account order by account")).toBe(
      "select account as Account order by account",
    );
  });

  it("is the identity on an already-lowercase query", () => {
    const query =
      "select payee, sum(number) where account ~ 'Assets' group by payee";
    expect(fold(query)).toBe(query);
  });
});
