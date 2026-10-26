import { loadCachedFileMapForRepo } from "@/foundation/clients/load-cached-ledger-file-map";
import { commitLedgerFiles } from "@/features/ledger/operations/commit-ledger-files";
import { findEntrySliceAsync } from "@/foundation/rustledger/source-slice-worker";
import { sliceSha256 } from "@/foundation/rustledger";
import { LedgerJournalService } from "@/features/ledger/service/ledger-journal-service";
import {
  ConflictError,
  NewLedgerErrorsError,
  UnbalancedTransactionError,
} from "@/shared/errors";

// Source-slice edits and deletes are refused when they would add a bean-check
// error, as structured adds are (w0/m2, w21/m1). The WASM engine cannot boot
// under jest, so a stub "engine" derives the errors from the file text: the
// 2026-08-29 Cash assertion fails unless FARMERS MARKET is dated before it,
// and a second `open` for Assets:Cash is an error wherever it sits.
jest.mock("@/foundation/clients/load-cached-ledger-file-map", () => ({
  loadCachedFileMapForRepo: jest.fn(),
}));

jest.mock("@/features/ledger/operations/commit-ledger-files", () => {
  const actual = jest.requireActual(
    "@/features/ledger/operations/commit-ledger-files",
  );
  return { ...actual, commitLedgerFiles: jest.fn() };
});

jest.mock("@/foundation/rustledger", () => {
  const actual = jest.requireActual("@/foundation/rustledger");
  return { ...actual, parseLedgerFiles: jest.fn() };
});

jest.mock("@/foundation/rustledger/source-slice-worker", () => ({
  findEntrySliceAsync: jest.fn(),
}));

import { parseLedgerFiles } from "@/foundation/rustledger";

const loadMock = loadCachedFileMapForRepo as jest.Mock;
const commitMock = commitLedgerFiles as jest.Mock;
const parseMock = parseLedgerFiles as jest.Mock;
const findMock = findEntrySliceAsync as jest.Mock;

const FARMERS = [
  '2026-08-28 * "FARMERS MARKET"',
  "  Assets:Cash  -23.50 USD",
  "  Expenses:Food",
].join("\n");
const FARMERS_LATE = FARMERS.replace("2026-08-28", "2026-08-30");
const FARMERS_UNBALANCED = FARMERS.replace(
  "  Expenses:Food",
  "  Expenses:Food  23.00 USD",
);
const COFFEE = [
  '2026-08-31 * "COFFEE"',
  "  Assets:Cash  -3.00 USD",
  "  Expenses:Food",
].join("\n");
const DUPLICATE_OPEN = "2026-09-01 open Assets:Cash USD";

const BLOCKS: Record<string, string> = {
  farmers: FARMERS,
  "farmers-late": FARMERS_LATE,
  coffee: COFFEE,
};

function ledger(...blocks: string[]): string {
  return [
    "2026-01-01 open Assets:Cash USD",
    "2026-01-01 open Expenses:Food USD",
    "",
    ...blocks.flatMap((block) => [block, ""]),
  ].join("\n");
}

const BALANCE = "2026-08-29 balance Assets:Cash 49.75 USD";

/** 1-based line of `text` in `content`, the way the engine reports it. */
function lineOf(content: string, text: string, occurrence = 0): number {
  const lines = content.split("\n");
  let seen = -1;
  return lines.findIndex((line) => line === text && ++seen === occurrence) + 1;
}

function fakeErrors(content: string) {
  const errors: { message: string; file: string; line: number }[] = [];
  if (!content.includes(FARMERS) && content.includes(BALANCE)) {
    errors.push({
      message:
        "Balance failed for Assets:Cash: expected 49.75 USD, got 73.25 USD",
      file: "main.bean",
      line: lineOf(content, BALANCE),
    });
  }
  if (content.includes(DUPLICATE_OPEN)) {
    errors.push({
      message: "Duplicate open directive for Assets:Cash",
      file: "main.bean",
      line: lineOf(content, DUPLICATE_OPEN),
    });
  }
  if (content.includes(FARMERS_UNBALANCED)) {
    errors.push({
      message: "Transaction does not balance: residual -0.50 USD",
      file: "main.bean",
      line: lineOf(content, FARMERS_UNBALANCED.split("\n")[0]),
    });
  }
  return errors;
}

let files: Record<string, string>;

function service() {
  return new LedgerJournalService(
    { getPublicApiClient: jest.fn() } as never,
    {} as never,
  );
}

beforeEach(() => {
  loadMock.mockReset();
  commitMock.mockReset();
  parseMock.mockReset();
  findMock.mockReset();
  loadMock.mockImplementation(async () => ({
    files: { ...files },
    entryPoint: "main.bean",
    repoPaths: ["main.bean"],
    managedPrices: [],
    managedPricePaths: [],
  }));
  commitMock.mockImplementation(
    async (
      _client: unknown,
      _owner: string,
      _repo: string,
      transforms: Map<string, (current: string | null) => Promise<string>>,
    ) => {
      for (const [path, apply] of transforms) {
        files[path] = await apply(files[path] ?? null);
      }
    },
  );
  findMock.mockImplementation(
    async (fileMap: Record<string, string>, _entry: string, hash: string) => {
      const block = BLOCKS[hash];
      const content = fileMap["main.bean"];
      if (!block || !content.includes(block)) return null;
      const startLine = lineOf(content, block.split("\n")[0]) - 1;
      return {
        file: "main.bean",
        slice: block,
        sha256: sliceSha256(block),
        startLine,
        endLine: startLine + block.split("\n").length,
        localOccurrence: 0,
      };
    },
  );
  parseMock.mockImplementation(async (fileMap: Record<string, string>) => ({
    directives: [],
    errors: fakeErrors(fileMap["main.bean"]),
    sourceDetails: {},
  }));
});

const LEDGER_ID = "alice/main";

const deleteFarmers = (allowInvalid?: boolean) =>
  service().deleteSourceSlice({
    ledgerId: LEDGER_ID,
    userId: "user-1",
    entryHash: "farmers",
    sha256sum: sliceSha256(FARMERS),
    allowInvalid,
  });

const redateFarmers = (allowInvalid?: boolean) =>
  service().updateSourceSlice({
    ledgerId: LEDGER_ID,
    userId: "user-1",
    entryHash: "farmers",
    sha256sum: sliceSha256(FARMERS),
    newContent: FARMERS_LATE,
    allowInvalid,
  });

describe("source-slice writes that would break the ledger", () => {
  beforeEach(() => {
    files = { "main.bean": ledger(FARMERS, BALANCE) };
  });

  it("refuses a delete the balance assertion depends on, committing nothing", async () => {
    const before = files["main.bean"];

    await expect(deleteFarmers()).rejects.toMatchObject({
      constructor: NewLedgerErrorsError,
      message: expect.stringMatching(
        /^this deletion would introduce 1 new bean-check error: Balance failed for Assets:Cash: expected 49\.75 USD, got 73\.25 USD \(main\.bean:\d+\)$/,
      ),
      metadata: { code: "NEW_LEDGER_ERRORS", details: { action: "delete" } },
    });
    expect(commitMock).not.toHaveBeenCalled();
    expect(files["main.bean"]).toBe(before);
  });

  it("refuses re-dating the entry past the assertion", async () => {
    await expect(redateFarmers()).rejects.toMatchObject({
      message: expect.stringMatching(
        /^this edit would introduce 1 new bean-check error: Balance failed for Assets:Cash/,
      ),
    });
    expect(commitMock).not.toHaveBeenCalled();
  });

  // w23/087: an edit whose only new error is imbalance reads UNBALANCED
  // like an add, not VALIDATION_FAILED.
  it("refuses an edit that unbalances the entry as UNBALANCED", async () => {
    files = { "main.bean": ledger(FARMERS) };
    const before = files["main.bean"];
    await expect(
      service().updateSourceSlice({
        ledgerId: LEDGER_ID,
        userId: "user-1",
        entryHash: "farmers",
        sha256sum: sliceSha256(FARMERS),
        newContent: FARMERS_UNBALANCED,
      }),
    ).rejects.toMatchObject({
      constructor: UnbalancedTransactionError,
      metadata: { code: "UNBALANCED", details: { residual: "-0.50 USD" } },
    });
    expect(commitMock).not.toHaveBeenCalled();
    expect(files["main.bean"]).toBe(before);
  });

  it("refuses a multi-delete that removes the entry", async () => {
    await expect(
      service().deleteMultiSourceSlices({
        ledgerId: LEDGER_ID,
        userId: "user-1",
        entries: [{ entryHash: "farmers", sha256sum: sliceSha256(FARMERS) }],
      }),
    ).rejects.toBeInstanceOf(NewLedgerErrorsError);
    expect(commitMock).not.toHaveBeenCalled();
  });

  it("commits the delete and the edit when allowInvalid asks for it", async () => {
    await redateFarmers(true);
    expect(files["main.bean"]).toContain(FARMERS_LATE);

    files = { "main.bean": ledger(FARMERS, BALANCE) };
    await deleteFarmers(true);
    expect(files["main.bean"]).not.toContain("FARMERS MARKET");
  });

  it("checks the entry's checksum before projecting anything", async () => {
    await expect(
      service().deleteSourceSlice({
        ledgerId: LEDGER_ID,
        userId: "user-1",
        entryHash: "farmers",
        sha256sum: sliceSha256("stale"),
      }),
    ).rejects.toBeInstanceOf(ConflictError);
    expect(parseMock).toHaveBeenCalledTimes(1);
    expect(commitMock).not.toHaveBeenCalled();
  });
});

// A preview runs the same projection check as a commit (w23/m7/t008): the
// refusal happens before the commit is skipped, so a breaking preview
// refuses and allowInvalid previews the breaking change instead.
describe("source-slice previews that would break the ledger", () => {
  beforeEach(() => {
    files = { "main.bean": ledger(FARMERS, BALANCE) };
  });

  it("refuses a breaking update on a preview, committing nothing", async () => {
    const before = files["main.bean"];
    await expect(
      service().updateSourceSlice({
        ledgerId: LEDGER_ID,
        userId: "user-1",
        entryHash: "farmers",
        sha256sum: sliceSha256(FARMERS),
        newContent: FARMERS_LATE,
        dryRun: true,
      }),
    ).rejects.toBeInstanceOf(NewLedgerErrorsError);
    expect(commitMock).not.toHaveBeenCalled();
    expect(files["main.bean"]).toBe(before);
  });

  it("refuses a breaking delete on a preview, committing nothing", async () => {
    const before = files["main.bean"];
    await expect(
      service().deleteSourceSlice({
        ledgerId: LEDGER_ID,
        userId: "user-1",
        entryHash: "farmers",
        sha256sum: sliceSha256(FARMERS),
        dryRun: true,
      }),
    ).rejects.toBeInstanceOf(NewLedgerErrorsError);
    expect(commitMock).not.toHaveBeenCalled();
    expect(files["main.bean"]).toBe(before);
  });

  it("refuses a breaking multi-delete on a preview, committing nothing", async () => {
    const before = files["main.bean"];
    await expect(
      service().deleteMultiSourceSlices({
        ledgerId: LEDGER_ID,
        userId: "user-1",
        entries: [{ entryHash: "farmers", sha256sum: sliceSha256(FARMERS) }],
        dryRun: true,
      }),
    ).rejects.toBeInstanceOf(NewLedgerErrorsError);
    expect(commitMock).not.toHaveBeenCalled();
    expect(files["main.bean"]).toBe(before);
  });

  it("previews the breaking change when allowInvalid asks for it", async () => {
    const before = files["main.bean"];
    const updated = await service().updateSourceSlice({
      ledgerId: LEDGER_ID,
      userId: "user-1",
      entryHash: "farmers",
      sha256sum: sliceSha256(FARMERS),
      newContent: FARMERS_LATE,
      allowInvalid: true,
      dryRun: true,
    });
    expect(updated.message).toBe("Would update the entry");
    expect(updated.preview).toEqual([
      { path: "main.bean", text: expect.stringContaining("2026-08-30") },
    ]);
    expect(commitMock).not.toHaveBeenCalled();
    expect(files["main.bean"]).toBe(before);
  });
});

describe("source-slice writes on a ledger that already has errors", () => {
  it("does not count an existing error that the write only moved", async () => {
    // Deleting COFFEE shifts the duplicate open three lines up.
    files = { "main.bean": ledger(FARMERS, BALANCE, COFFEE, DUPLICATE_OPEN) };

    const deleted = await service().deleteSourceSlice({
      ledgerId: LEDGER_ID,
      userId: "user-1",
      entryHash: "coffee",
      sha256sum: sliceSha256(COFFEE),
    });

    expect(files["main.bean"]).not.toContain("COFFEE");
    // w23/042: the file the delete rewrote, for MCP's `wrote`.
    expect(deleted.files).toEqual(["main.bean"]);
  });

  it("commits an edit that fixes the existing error", async () => {
    files = { "main.bean": ledger(FARMERS_LATE, BALANCE) };

    await service().updateSourceSlice({
      ledgerId: LEDGER_ID,
      userId: "user-1",
      entryHash: "farmers-late",
      sha256sum: sliceSha256(FARMERS_LATE),
      newContent: FARMERS,
    });

    expect(files["main.bean"]).toContain(FARMERS);
  });
});
