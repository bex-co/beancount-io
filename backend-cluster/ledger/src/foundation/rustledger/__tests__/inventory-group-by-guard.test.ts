import { inventoryGroupByError } from "../inventory-group-by-guard";

/** w23/129: the engine collapses GROUP BY balance into one group. */
describe("inventoryGroupByError", () => {
  it.each([
    "SELECT balance, count(*) FROM postings GROUP BY balance",
    "SELECT balance, count(*) FROM postings GROUP BY balance, payee",
    "SELECT payee, count(*) FROM postings GROUP BY payee, balance",
    "select balance, count(*) from postings group by balance",
    "SELECT balance, count(*) FROM postings GROUP BY (balance)",
    "SELECT p.balance, count(*) FROM postings p GROUP BY p.balance",
    "SELECT * FROM (SELECT balance, count(*) FROM postings GROUP BY balance) LIMIT 5",
    "SELECT balance, count(*) FROM postings GROUP BY 1",
    "SELECT t.balance, count(*) FROM postings t GROUP BY 1",
    "SELECT DISTINCT balance, count(*) FROM postings GROUP BY 1",
    "SELECT payee, balance, count(*) FROM postings GROUP BY 2",
    "SELECT payee, balance, count(*) FROM postings GROUP BY 1, 2",
    "SELECT balance, count(*) FROM postings GROUP BY balance HAVING count(*) > 1",
    "SELECT balance, count(*) FROM postings GROUP BY balance ORDER BY balance",
    "SELECT balance, count(*) FROM postings WHERE payee = 'x' GROUP BY balance LIMIT 5",
  ])("refuses %p", (query) => {
    const refused = inventoryGroupByError(query);
    expect(refused?.rows).toEqual([]);
    expect(refused?.errors[0]).toMatchObject({
      severity: "error",
      message: expect.stringContaining("inventory column balance"),
    });
  });

  it.each([
    "SELECT account_balance, count(*) FROM postings GROUP BY account_balance",
    "select account_balance, count(*) from postings group by account_balance",
    "SELECT payee, count(*) FROM postings GROUP BY payee, account_balance",
    "SELECT p.account_balance, count(*) FROM postings p GROUP BY p.account_balance",
    "SELECT account_balance, count(*) FROM postings GROUP BY 1",
    "SELECT payee, account_balance, count(*) FROM postings GROUP BY 2",
  ])("refuses the account_balance sibling %p (w23/179)", (query) => {
    expect(inventoryGroupByError(query)?.errors[0]).toMatchObject({
      severity: "error",
      message: expect.stringContaining("inventory column account_balance"),
      hint: expect.stringContaining("SELECT DISTINCT account_balance"),
    });
  });

  it.each([
    "SELECT account_balance, count(*) FROM postings GROUP BY payee",
    "SELECT payee AS account_balance, count(*) FROM postings GROUP BY account_balance",
    "SELECT str(account_balance), count(*) FROM postings GROUP BY str(account_balance)",
    "SELECT narration WHERE narration = 'GROUP BY account_balance'",
  ])("leaves account_balance query %p alone", (query) => {
    expect(inventoryGroupByError(query)).toBeUndefined();
  });

  it.each([
    // position and tags group correctly; never refused.
    "SELECT position, count(*) FROM postings GROUP BY position",
    "SELECT tags, count(*) FROM postings GROUP BY tags",
    "SELECT payee, count(*) FROM postings GROUP BY payee",
    "SELECT payee, count(*) FROM postings GROUP BY 1",
    // balance projected or ordered, but not grouped.
    "SELECT balance, count(*) FROM postings GROUP BY payee",
    "SELECT * FROM postings ORDER BY balance",
    "SELECT payee, count(*) FROM postings GROUP BY payee ORDER BY balance",
    "SELECT balance FROM postings",
    // Calls group by scalar results (loud on the engine either way).
    "SELECT str(balance), count(*) FROM postings GROUP BY str(balance)",
    // An AS alias rebinds the name; the engine groups the alias correctly.
    "SELECT payee AS balance, count(*) FROM postings GROUP BY balance",
    // The words inside a string literal are not the clause.
    "SELECT narration WHERE narration = 'GROUP BY balance'",
    // Substring names are not the column.
    "SELECT rebalance, count(*) FROM postings GROUP BY rebalance",
    // GROUP BY ALL reads as a missing column on both sides.
    "SELECT payee, count(*) FROM postings GROUP BY ALL",
    // Ordinals with subqueries abstain (no pairing without nesting).
    "SELECT * FROM (SELECT payee, count(*) FROM postings GROUP BY 1) LIMIT 1",
    // No grouping at all (the 128 guard owns the comparison).
    "SELECT count(*) FROM postings WHERE balance = balance",
  ])("leaves %p alone", (query) => {
    expect(inventoryGroupByError(query)).toBeUndefined();
  });
});
