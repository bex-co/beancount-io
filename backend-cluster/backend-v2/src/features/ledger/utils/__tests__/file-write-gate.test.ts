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
