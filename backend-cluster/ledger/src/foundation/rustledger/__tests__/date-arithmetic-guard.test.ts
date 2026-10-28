import { dateArithmeticError } from "../date-arithmetic-guard";

/**
 * w23/165: stock shifts dates by day counts; the engine adds numbers only.
 * Every fire/skip rule below was probed against stock beanquery 0.2.0 (see
 * the module header); the live script pins the engine side.
 */
describe("dateArithmeticError", () => {
  it.each([
    "SELECT date + 7 LIMIT 1",
    "SELECT date - 7 LIMIT 1",
    "SELECT 7 + date LIMIT 1",
    "SELECT date - date LIMIT 1",
    "SELECT date+7 LIMIT 1",
    "SELECT date-7 LIMIT 1",
    "SELECT 7+date LIMIT 1",
    "SELECT date-date LIMIT 1",
    "SELECT date + -7 LIMIT 1",
    "SELECT date + - 7 LIMIT 1",
    "SELECT date --7 LIMIT 1",
    "SELECT +date + 7 LIMIT 1",
    "SELECT (+date) + 7 LIMIT 1",
    "SELECT (date) + (7) LIMIT 1",
    "SELECT ((date)) + 7 LIMIT 1",
    "SELECT min(date) + 1 LIMIT 1",
    "SELECT min (date) + 1 LIMIT 1",
    "SELECT max(date) - min(date) LIMIT 1",
    "SELECT (date + 1) + 1 LIMIT 1",
    "SELECT date + year FROM postings LIMIT 1",
    "SELECT date + month FROM postings LIMIT 1",
    "SELECT date + day FROM postings LIMIT 1",
    "SELECT date + lineno FROM postings LIMIT 1",
    "SELECT 2026-01-08 + 7 LIMIT 1",
    "SELECT +2026-01-08 + 7 LIMIT 1",
    "SELECT date - 2026-01-01 LIMIT 1",
    "SELECT cost_date + 7 FROM postings LIMIT 1",
    "SELECT date_add(date, 1) + 1 LIMIT 1",
    "SELECT date + date_diff(date, date) LIMIT 1",
    "SELECT payee FROM postings WHERE date > date - 30 LIMIT 1",
    "select DATE + 7 LIMIT 1",
    // Block comments strip in-guard, so they join the pair for direct
    // engine callers that skip the service normalize.
    "SELECT date + /* inline */ 7 LIMIT 1",
  ])("refuses %p", (query) => {
    const refused = dateArithmeticError(query);
    expect(refused?.rows).toEqual([]);
    expect(refused?.errors[0]).toMatchObject({
      severity: "error",
      phase: "query",
      message: expect.stringContaining("Date arithmetic with + and -"),
      hint: expect.stringContaining("date_add(date, days)"),
    });
  });

  it("points at the date_add/date_diff workaround", () => {
    const refused = dateArithmeticError("SELECT date + 7 LIMIT 1");
    expect(refused?.errors[0]?.message).toContain(
      "date_add(date, days) and date_diff(first, second)",
    );
  });

  it.each([
    // Numbers still add; other operators co-refuse on both sides already.
    "SELECT 1 + 2 AS s LIMIT 1",
    "SELECT 1 - 2 AS s LIMIT 1",
    "SELECT -date LIMIT 1",
    // neg(date) refuses in stock too.
    "SELECT -date + 7 LIMIT 1",
    "SELECT (-date) + 7 LIMIT 1",
    "SELECT -2026-01-08 + 7 LIMIT 1",
    // Every other date pairing refuses in stock too.
    "SELECT 7 - date LIMIT 1",
    "SELECT 1 + 2 - date LIMIT 1",
    "SELECT date + date LIMIT 1",
    "SELECT date + TRUE LIMIT 1",
    "SELECT date + 1.5 LIMIT 1",
    "SELECT date + number FROM postings LIMIT 1",
    "SELECT date + id FROM postings LIMIT 1",
    "SELECT date * 2 LIMIT 1",
    "SELECT 2 * date + 7 LIMIT 1",
    "SELECT 2 * +date + 7 LIMIT 1",
    "SELECT date + 'x' LIMIT 1",
    "SELECT 'x' + date LIMIT 1",
    // The workarounds themselves pass.
    "SELECT date_add(date, 7) LIMIT 1",
    "SELECT date_diff(date, date) LIMIT 1",
    // `++` is left for the engine's syntax error, like w23/154.
    "SELECT date ++ 7 LIMIT 1",
    // `sum` may widen; unproven names and calls abstain.
    "SELECT sum(year) + date FROM postings LIMIT 1",
    "SELECT open_date + 7 LIMIT 1",
    "SELECT nosuchfn(date) + 7 LIMIT 1",
    // Stock has no table aliases — dotted refs parse-error there.
    "SELECT p.date + 7 FROM postings p LIMIT 1",
    // A paren holding an operator stays put — no forged cross-paren pairs.
    "SELECT date - (7 - date) LIMIT 1",
    "SELECT (7 - date) + 1 LIMIT 1",
    // An AS alias may retype the name; the guard stays out.
    "SELECT payee AS date, date + 7 LIMIT 1",
    // The pair inside a string literal or comment is not syntax.
    "SELECT 'date+7' LIMIT 1",
    "SELECT date /* + 7 */ LIMIT 1",
    // Non-SELECT statements are out of scope.
    "CHECK date + 7",
  ])("leaves %p alone", (query) => {
    expect(dateArithmeticError(query)).toBeUndefined();
  });
});
