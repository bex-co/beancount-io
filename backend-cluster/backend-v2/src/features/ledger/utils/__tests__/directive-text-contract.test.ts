import { unbalancedOrValidationError } from "../directive-text-contract";
import { toBeanCheckErrors, UNBALANCED_ERROR_CODE } from "../bean-check-errors";
import { ErrorCategory } from "@/shared/errors";

/**
 * w2/013 — classification reads a field, not prose.
 *
 * The ledger engine emits `E3001` for a transaction that does not balance and
 * has done all along; the mapper simply dropped it, so this decision was made
 * by `/does not balance|residual/i` over the message. A reworded engine
 * message would have silently downgraded UNBALANCED to VALIDATION_FAILED and
 * no test could have caught it. These pin the code path and the fallback.
 */

describe("unbalancedOrValidationError", () => {
  it("reads UNBALANCED off the engine's code", () => {
    const error = unbalancedOrValidationError([
      {
        message: "Transaction does not balance: residual 1.50 USD",
        code: UNBALANCED_ERROR_CODE,
      },
    ]);
    expect(error).toMatchObject({
      category: ErrorCategory.UNBALANCED,
      metadata: { residual: "1.50 USD" },
    });
  });

  it("still says UNBALANCED when the engine rewords the message", () => {
    // The whole point: prose is the engine's to change, the code is not.
    const error = unbalancedOrValidationError([
      {
        message: "postings do not sum to zero; off by 1.50 USD",
        code: UNBALANCED_ERROR_CODE,
      },
    ]);
    expect(error).toMatchObject({ category: ErrorCategory.UNBALANCED });
  });

  it("does not say UNBALANCED for a coded error that is something else", () => {
    // Previously "Balance failed for Assets:Cash … residual" would have
    // matched the residual pattern and been reported as an unbalanced
    // transaction, which it is not.
    const error = unbalancedOrValidationError([
      {
        message:
          "Balance failed for Assets:Cash: expected 999.00 USD, got residual -3.00 USD",
        code: "E2001",
      },
    ]);
    expect(error).toMatchObject({ category: ErrorCategory.VALIDATION_FAILED });
  });

  it("falls back to the wording when the engine reported no code", () => {
    // A deployment whose ledger service predates the code travelling through
    // degrades to the old behaviour rather than misclassifying everything.
    const error = unbalancedOrValidationError([
      { message: "Transaction does not balance: residual 5 USD" },
    ]);
    expect(error).toMatchObject({
      category: ErrorCategory.UNBALANCED,
      metadata: { residual: "5 USD" },
    });
  });

  it("reports any other new error as a validation failure", () => {
    const error = unbalancedOrValidationError([
      { message: "Account Expenses:NotOpened was never opened", code: "E1001" },
    ]);
    expect(error).toMatchObject({
      category: ErrorCategory.VALIDATION_FAILED,
      metadata: { field: "text" },
    });
    expect(error.message).toContain("Expenses:NotOpened");
  });

  it("names a remedy the transport can use verbatim", () => {
    expect(
      unbalancedOrValidationError([{ message: "boom", code: "E1001" }]),
    ).toMatchObject({
      metadata: { hint: expect.stringContaining("allowInvalid") },
    });
  });
});

describe("toBeanCheckErrors", () => {
  it("carries the engine code through, and omits it when absent", () => {
    expect(
      toBeanCheckErrors([
        {
          message: "does not balance",
          code: "E3001",
          source: { filename: "main.bean", lineno: 5 },
        },
        { message: "uncoded", code: null },
      ]),
    ).toEqual([
      { message: "does not balance", code: "E3001", source: "main.bean:5" },
      { message: "uncoded" },
    ]);
  });
});
