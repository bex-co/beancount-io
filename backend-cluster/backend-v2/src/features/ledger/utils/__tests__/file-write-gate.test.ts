import { NewLedgerErrorsError } from "@/shared/errors";
import type { Identity } from "@/server/api/identity";
import { gateFileWrite, type FileWriteGateServices } from "../file-write-gate";

const identity = { userId: "usr_alice" } as Identity;
const overlays = [{ path: "a.bean", content: "x" }];
const error = (message: string) => ({
  message,
  source: { filename: "a.bean", lineno: 1 },
});

/** An error as the ledger service reports it, with or without a location. */
type Reported = {
  message: string;
  source?: { filename: string; lineno: number };
};

function services(
  baseline: () => Promise<Reported[]>,
  projected: Reported[],
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

  // w31/115: inserting a missing buy above a sale that fails to book changes
  // the lots its error quotes; updateLedgerFiles refused the edit for it.
  it("passes an edit that only moves a lot error's available figure or lot count", async () => {
    const short = (available: string) =>
      error(
        `Not enough units in Assets:Broker: requested 10, available ${available}; not enough to reduce (2026-03-01, "sell-a")`,
      );
    const ambiguous = (lots: number) =>
      error(
        `Ambiguous lot match for HOOL: ${lots} lots match in Assets:Strict (2026-03-01, "sell-s")`,
      );
    const result = await gateFileWrite(
      services(
        async () => [short("5"), ambiguous(2)],
        [short("7"), ambiguous(3)],
      ),
      identity,
      "alice/main",
      overlays,
      false,
    );
    expect(result).toMatchObject({
      errorsBefore: 2,
      errorsAfter: 2,
      newErrors: [],
      valid: true,
    });
  });

  // w31/127: opening an account that sorts before the first one using a
  // currency relabels check_commodity's error, and posting to a mixed account
  // later in another file moves onecommodity's; updateLedgerFiles refused both.
  it("passes an edit that only relabels or moves a commodity-plugin error", async () => {
    const missing = (account: string) => ({
      message: `Missing Commodity directive for 'USD' in '${account}'`,
    });
    const mixed = (currencies: string, filename: string) => ({
      message: `More than one currency in account 'Expenses:Travel': ${currencies}`,
      source: { filename, lineno: 1 },
    });
    const result = await gateFileWrite(
      services(
        async () => [
          missing("Assets:US:BofA:Checking"),
          mixed("USD,EUR", "main.bean"),
        ],
        [missing("Assets:US:Ally:Savings"), mixed("EUR,USD", "2027.bean")],
      ),
      identity,
      "alice/main",
      overlays,
      false,
    );
    expect(result).toMatchObject({
      errorsBefore: 2,
      errorsAfter: 2,
      newErrors: [],
      valid: true,
    });
  });

  it("still refuses a new undeclared currency beside a known one (w31/127)", async () => {
    const missing = (currency: string, account: string) => ({
      message: `Missing Commodity directive for '${currency}' in '${account}'`,
    });
    await expect(
      gateFileWrite(
        services(
          async () => [missing("USD", "Assets:Bank")],
          [missing("USD", "Assets:Ally"), missing("GBP", "Assets:UK:Cash")],
        ),
        identity,
        "alice/main",
        overlays,
        false,
      ),
    ).rejects.toBeInstanceOf(NewLedgerErrorsError);
  });

  // w31/128: one updateLedgerFiles commit that writes an uncosted VTI holding
  // dated earlier, and lines above a price, into the other file moves both
  // coherent_cost's and unique_prices' errors there.
  describe("over a plugin error the edit moves to another file", () => {
    const placed = (message: string, filename: string, lineno: number) => ({
      message,
      source: { filename, lineno },
    });
    const VTI = "Currency 'VTI' is used both with and without cost";
    const PRICES = "Disagreeing price entries";
    const before = async () => [
      placed(VTI, "main.bean", 98),
      placed(PRICES, "qa-other.bean", 7),
    ];

    it("passes it", async () => {
      const result = await gateFileWrite(
        services(before, [
          placed(VTI, "qa-other.bean", 3),
          placed(PRICES, "main.bean", 10),
        ]),
        identity,
        "alice/main",
        overlays,
        false,
      );
      expect(result).toMatchObject({
        errorsBefore: 2,
        errorsAfter: 2,
        newErrors: [],
        valid: true,
      });
    });

    it("still refuses a second currency held both ways, or a second disagreeing day", async () => {
      for (const added of [
        placed(
          "Currency 'BND' is used both with and without cost",
          "a.bean",
          4,
        ),
        placed(PRICES, "qa-other.bean", 12),
      ]) {
        await expect(
          gateFileWrite(
            services(before, [
              placed(VTI, "qa-other.bean", 3),
              placed(PRICES, "main.bean", 10),
              added,
            ]),
            identity,
            "alice/main",
            overlays,
            false,
          ),
        ).rejects.toBeInstanceOf(NewLedgerErrorsError);
      }
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
