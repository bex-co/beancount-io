import { printFromError } from "../print-from-guard";

describe("PRINT FROM predicates", () => {
  it.each([
    "PRINT FROM payee ~ 'BLUE'",
    "print\nfrom\t(year = 2026 AND month = 8);",
    "PRINT FROM date >= 2026-08-01",
    "PRINT FROM OPEN ON 2026-01-01 month = 8",
    "PRINT FROM OPEN ON 2026-1-1 CLOSE ON 2027-1-1 month = 8",
    "PRINT FROM CLOSE 2027-01-01 TRUE",
    "PRINT FROM 'CLOSE ON 2027-01-01'",
  ])("refuses %p and returns no directives", (query) => {
    expect(printFromError(query)).toMatchObject({
      columns: [],
      rows: [],
      errors: [
        {
          phase: "query",
          severity: "error",
          message: expect.stringContaining("SELECT … FROM entries WHERE …"),
        },
      ],
    });
  });

  it.each([
    "PRINT",
    "PRINT;",
    "PRINT FROM OPEN ON 2026-01-01",
    "PRINT FROM CLOSE ON 2027-01-01",
    "PRINT FROM CLOSE 2027-1-1",
    "PRINT FROM OPEN ON 2026-01-01 CLOSE ON 2027-01-01 CLEAR;",
    "SELECT payee FROM entries WHERE narration = 'PRINT FROM year = 2026'",
    "BALANCES FROM year = 2026",
  ])("leaves %p to its existing execution path", (query) => {
    expect(printFromError(query)).toBeUndefined();
  });
});
