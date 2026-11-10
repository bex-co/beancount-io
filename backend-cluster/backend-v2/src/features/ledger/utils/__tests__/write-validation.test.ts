import { NotFoundError } from "@/shared/errors";
import type { Identity } from "@/server/api/identity";
import { summarizeWrite, withPostWriteValidation } from "../write-validation";

const IDENTITY: Identity = {
  userId: "usr_alice",
  method: "oauth",
  scopes: new Set(["ledger.read", "ledger.write"]),
};

/**
 * w23/031. The check is fail-open so a committed write never reads as
 * failed, but a check that could not run was reported as a clean ledger:
 * deleting main.bean said "No new bean-check errors".
 */
describe("withPostWriteValidation", () => {
  const run = (getErrors: jest.Mock) =>
    withPostWriteValidation(
      { ledgerData: { getErrors } as never },
      IDENTITY,
      "alice/main",
      async () => "written",
    );

  it("reports a check that could not run after the write as unchecked", async () => {
    const getErrors = jest
      .fn()
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(
        new NotFoundError("Ledger resource", "alice/main"),
      );
    const { written, validation } = await run(getErrors);
    expect(written).toBe("written");
    // An unverified ledger is never reported as valid (w23/219).
    expect(validation).toMatchObject({
      checked: false,
      valid: false,
      checkError: expect.stringContaining("not found"),
    });
    expect(
      summarizeWrite("Committed 1 change(s) to main.bean", validation),
    ).toBe(
      `Committed 1 change(s) to main.bean. bean-check could not run, so the ledger is unverified: ${validation.checkError}`,
    );
  });

  it("reports a check that could not run before the write as unchecked", async () => {
    const getErrors = jest
      .fn()
      .mockRejectedValueOnce(new Error("socket hang up"))
      .mockResolvedValueOnce([{ message: "old error" }]);
    const { validation } = await run(getErrors);
    // An internal failure is not echoed to the caller.
    expect(validation).toMatchObject({
      checked: false,
      checkError: "the ledger check failed",
    });
  });

  // w23/034: an edit that only shifts lines reported the moved error as new.
  it("does not report an existing error that the write only moved", async () => {
    const moved = (line: number) => ({
      message: "Document file not found: a.pdf",
      source: { filename: "main.bean", lineno: line },
    });
    const getErrors = jest
      .fn()
      .mockResolvedValueOnce([moved(93)])
      .mockResolvedValueOnce([moved(97)]);
    const { validation } = await run(getErrors);
    expect(validation).toEqual({
      errorsBefore: 1,
      errorsAfter: 1,
      newErrors: [],
      valid: true,
    });
  });

  it("leaves a check that ran unmarked", async () => {
    const getErrors = jest
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ message: "new error" }]);
    const { validation } = await run(getErrors);
    expect(validation).toEqual({
      errorsBefore: 0,
      errorsAfter: 1,
      newErrors: [{ message: "new error" }],
      valid: false,
    });
  });
});
