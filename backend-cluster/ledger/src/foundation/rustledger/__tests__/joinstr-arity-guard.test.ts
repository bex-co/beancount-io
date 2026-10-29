import { joinstrArityError } from "../joinstr-arity-guard";

describe("joinstrArityError (w23/186)", () => {
  it.each([
    "SELECT joinstr(other_accounts, ',') FROM postings",
    "select JOINSTR ( accounts , ';' ) from postings",
    "SELECT joinstr(tags, ',', 'x')",
    "SELECT joinstr(tags, 5)",
    "SELECT joinstr(tags, NULL)",
    "SELECT payee, joinstr(sum(number), ',') GROUP BY payee",
  ])("refuses %p", (query) => {
    const refused = joinstrArityError(query);
    expect(refused?.rows).toEqual([]);
    expect(refused?.errors[0]).toMatchObject({
      severity: "error",
      message: expect.stringContaining("joinstr takes one argument"),
    });
  });

  it("reports how many arguments were given", () => {
    expect(
      joinstrArityError("SELECT joinstr(tags, ',', 'x')")?.errors[0].message,
    ).toContain("but 3 were given");
  });

  it.each([
    "SELECT joinstr(other_accounts) FROM postings",
    "SELECT joinstr(upper(payee)) FROM postings",
    "SELECT joinstr(convert(position, 'USD')) FROM postings",
    "SELECT narration WHERE narration ~ 'joinstr(a, b)'",
    "SELECT my.joinstr(a, b)",
    "SELECT rejoinstr(a, b)",
  ])("leaves %p alone", (query) => {
    expect(joinstrArityError(query)).toBeUndefined();
  });
});
