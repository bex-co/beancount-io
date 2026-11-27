import { NewLedgerErrorsError } from "@/shared/errors";
import type { Identity } from "@/server/api/identity";
import { gateFileWrite, type FileWriteGateServices } from "../file-write-gate";

const identity = { userId: "usr_alice" } as Identity;
const overlays = [{ path: "a.bean", content: "x" }];
const error = (message: string) => ({
  message,
  source: { filename: "a.bean", lineno: 1 },
});

function services(
  baseline: () => Promise<ReturnType<typeof error>[]>,
  projected: ReturnType<typeof error>[],
): FileWriteGateServices {
  return {
    ledgerRepo: { checkProjectedFiles: jest.fn(async () => projected) },
    ledgerData: { getErrors: jest.fn(baseline) },
  } as unknown as FileWriteGateServices;
}

describe("gateFileWrite", () => {
  it("passes a write that adds nothing, whatever the ledger already had", async () => {
    const result = await gateFileWrite(
      services(async () => [error("old")], [error("old")]),
      identity,
      "alice/main",
      overlays,
      false,
    );
    expect(result).toMatchObject({ newErrors: [], valid: true });
    expect(result.checked).toBeUndefined();
  });

  it("refuses an error the write adds", async () => {
    await expect(
      gateFileWrite(
        services(async () => [error("old")], [error("old"), error("new")]),
        identity,
        "alice/main",
        overlays,
        false,
      ),
    ).rejects.toBeInstanceOf(NewLedgerErrorsError);
  });

  // w31/113: a file write above an assertion that already fails changes the
  // figure it quotes; updateLedgerFiles refused the edit for that old error.
  it("passes an edit that only moves a failing assertion's reached figure", async () => {
    const failed = (got: string) =>
      error(`Balance failed for Assets:Cash: expected 40.00 USD, got ${got}`);
    const result = await gateFileWrite(
      services(async () => [failed("49.75 USD")], [failed("44.75 USD")]),
      identity,
      "alice/main",
      overlays,
      false,
    );
    expect(result).toMatchObject({
      errorsBefore: 1,
      errorsAfter: 1,
      newErrors: [],
      valid: true,
    });
  });

  // w23/233: an unreadable baseline read as "no errors", so each error the
  // ledger already had counted as new.
  it("says it was not checked, and refuses nothing, when the baseline cannot be read", async () => {
    const result = await gateFileWrite(
      services(async () => {
        throw new Error("ledger service unavailable");
      }, [error("old")]),
      identity,
      "alice/main",
      overlays,
      false,
    );
    expect(result).toEqual({
      errorsBefore: 0,
      errorsAfter: 0,
      newErrors: [],
      valid: false,
      checked: false,
      checkError: "the ledger check failed",
    });
  });
});

// w31/102: a delete's removeIncludes rewrites the includer without its
// include line, so bean-check names a line one above the one the caller has.
describe("gateFileWrite with dropped lines", () => {
  const never = {
    message: "Account Assets:Gone was never opened",
    source: { filename: "main.bean", lineno: 89 },
  };
  const above = {
    message: "Account Assets:Above was never opened",
    source: { filename: "main.bean", lineno: 3 },
  };
  const droppedLines = new Map([["main.bean", [7]]]);
  const gate = (allowInvalid: boolean, dryRun?: boolean) =>
    gateFileWrite(
      services(async () => [], [never, above]),
      identity,
      "alice/main",
      overlays,
      allowInvalid,
      { droppedLines, ...(dryRun !== undefined && { dryRun }) },
    );

  it("refuses naming each new error at its line in the file as it stands", async () => {
    const refusal = gate(false);
    await expect(refusal).rejects.toBeInstanceOf(NewLedgerErrorsError);
    await expect(refusal).rejects.toThrow(
      "Account Assets:Gone was never opened (main.bean:90); Account Assets:Above was never opened (main.bean:3)",
    );
  });

  it("previews the same lines", async () => {
    expect((await gate(true, true)).newErrors).toEqual([
      { message: never.message, source: "main.bean:90" },
      { message: above.message, source: "main.bean:3" },
    ]);
  });

  it("keeps the line after the write on a commit it lets through", async () => {
    expect((await gate(true)).newErrors).toEqual([
      { message: never.message, source: "main.bean:89" },
      { message: above.message, source: "main.bean:3" },
    ]);
  });
});
