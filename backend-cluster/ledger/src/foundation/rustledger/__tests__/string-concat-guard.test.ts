import { stringConcatError } from "../string-concat-guard";

/** w23/154: stock concatenates str+str; the engine only adds numbers. */
describe("stringConcatError", () => {
  it.each([
    "SELECT 'a' + 'b' AS s LIMIT 1",
    "SELECT 'a'+'b' AS s LIMIT 1",
    "SELECT payee + '!' AS s FROM postings LIMIT 1",
    "SELECT '!' + payee AS s FROM postings LIMIT 1",
    "SELECT narration + payee AS s FROM postings LIMIT 1",
    "SELECT upper(payee) + lower(narration) AS s FROM postings LIMIT 1",
    "SELECT p.payee + '!' AS s FROM postings p LIMIT 1",
  ])("refuses %p", (query) => {
    const refused = stringConcatError(query);
    expect(refused?.rows).toEqual([]);
    expect(refused?.errors[0]).toMatchObject({
      severity: "error",
      message: expect.stringContaining("String concatenation with +"),
    });
  });

  it.each([
    // Numbers still add; mixed and NULL keep 132's or the engine's refusal.
    "SELECT 1 + 2 AS s LIMIT 1",
    "SELECT number + 1 AS s FROM postings LIMIT 1",
    "SELECT 'a' + 1 AS s LIMIT 1",
    "SELECT 1 + payee AS s FROM postings LIMIT 1",
    "SELECT NULL + 'b' AS s LIMIT 1",
    "SELECT date + 1 AS s FROM postings LIMIT 1",
    // Unknown functions and aggregates abstain (unproven).
    "SELECT nosuchfn(payee) + '!' AS s FROM postings LIMIT 1",
    "SELECT first(payee) + '!' AS s FROM postings LIMIT 1",
    // Other operators co-refuse on both sides already.
    "SELECT 'a' - 'b' AS s LIMIT 1",
    "SELECT 'a' * 2 AS s LIMIT 1",
    // `++` is left for the engine's syntax error.
    "SELECT 'a' ++ 'b' AS s LIMIT 1",
    // An AS alias may retype the name; the guard stays out.
    "SELECT 1 AS payee FROM postings WHERE payee + '!' = 'x'",
    // The plus inside a string literal is not syntax.
    "SELECT narration WHERE narration = 'a+b' LIMIT 1",
    // Non-SELECT statements are out of scope.
    "CHECK 'a' + 'b'",
  ])("leaves %p alone", (query) => {
    expect(stringConcatError(query)).toBeUndefined();
  });
});
