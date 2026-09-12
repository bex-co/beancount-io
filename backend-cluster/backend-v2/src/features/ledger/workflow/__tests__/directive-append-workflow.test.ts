import { DirectiveAppendWorkflow } from "../directive-append-workflow";
import { MAX_APPENDED_DIRECTIVES } from "@/features/ledger/utils/directive-text-contract";
import type { Identity } from "@/server/api/identity";

/**
 * w2/012 — the append coordinates over the repository service.
 *
 * What is asserted here is the reason it moved: every path the append touches
 * reaches the repo service, so the guards that service applies (per-operation
 * `assertSafeRepoPath`, write authorization, the dry-run stop) cover targets
 * the ledger's own routing rules produced, not only the ones a caller named.
 */

const IDENTITY: Identity = {
  userId: "usr_alice",
  method: "oauth",
  scopes: new Set(["ledger.read", "ledger.write"]),
};
const LEDGER_ID = "alice/main";

const TXN = [
  '2026-02-05 * "Cafe" "Coffee"',
  "  Expenses:Food    4.50 USD",
  "  Assets:Cash     -4.50 USD",
  "",
].join("\n");

function fixture(
  options: {
    files?: Record<string, string>;
    transactionFile?: string | null;
    projectedErrors?: { message: string }[];
  } = {},
) {
  const files = new Map(Object.entries(options.files ?? {}));
  const ledgerRepo = {
    getFilesContent: jest.fn(async ({ paths }: { paths: string[] }) =>
      paths
        .filter((path) => files.has(path))
        .map((path) => ({
          path,
          content: files.get(path)!,
          sha: `sha-${path}`,
        })),
    ),
    checkProjectedFiles: jest.fn(
      async ({ overlays }: { overlays: unknown[] }) =>
        overlays.length === 0 ? [] : (options.projectedErrors ?? []),
    ),
    changeFiles: jest.fn(
      async (_params: { operations: { path: string; content?: string }[] }) =>
        undefined,
    ),
  };
  const favaClientFactory = {
    getPublicApiClient: async () => ({
      reports: {
        getLedgerBcioOptions: async () => ({
          data: {
            success: true,
            data: {
              default_file: "main.bean",
              transaction_file:
                options.transactionFile === undefined
                  ? null
                  : options.transactionFile,
            },
          },
        }),
      },
    }),
  };
  return {
    ledgerRepo,
    workflow: new DirectiveAppendWorkflow(
      ledgerRepo as never,
      favaClientFactory as never,
    ),
  };
}

describe("DirectiveAppendWorkflow", () => {
  it("commits an auto-routed target through the repo service, so its path is asserted", async () => {
    const { workflow, ledgerRepo } = fixture({
      files: { "txns/2026.bean": "" },
      transactionFile: "txns/{year}.bean",
    });
    const result = await workflow.appendDirectiveText({
      identity: IDENTITY,
      ledgerId: LEDGER_ID,
      input: { text: TXN },
    });
    expect(result.success).toBe(true);
    // The path the ledger's routing rules produced — never named by the
    // caller — arrives at the guarded write, which is the whole point.
    expect(ledgerRepo.changeFiles).toHaveBeenCalledWith(
      expect.objectContaining({
        ledgerId: LEDGER_ID,
        identity: IDENTITY,
        operations: [
          expect.objectContaining({
            operation: "update",
            path: "txns/2026.bean",
            sha: "sha-txns/2026.bean",
          }),
        ],
      }),
    );
  });

  it("hands the repo service plain text, not base64", async () => {
    const { workflow, ledgerRepo } = fixture({ files: { "main.bean": "" } });
    await workflow.appendDirectiveText({
      identity: IDENTITY,
      ledgerId: LEDGER_ID,
      input: { text: TXN },
    });
    const { operations } = ledgerRepo.changeFiles.mock.calls[0][0];
    expect(operations[0].content).toContain('2026-02-05 * "Cafe"');
  });

  it("creates a routed file that does not exist yet", async () => {
    const { workflow, ledgerRepo } = fixture({
      transactionFile: "txns/{year}.bean",
    });
    await workflow.appendDirectiveText({
      identity: IDENTITY,
      ledgerId: LEDGER_ID,
      input: { text: TXN },
    });
    expect(ledgerRepo.changeFiles).toHaveBeenCalledWith(
      expect.objectContaining({
        operations: [
          expect.objectContaining({
            operation: "create",
            path: "txns/2026.bean",
          }),
        ],
      }),
    );
  });

  it("checks the projection before committing, and refuses on new errors", async () => {
    const { workflow, ledgerRepo } = fixture({
      files: { "main.bean": "" },
      projectedErrors: [
        { message: "Transaction does not balance: residual 1.00 USD" },
      ],
    });
    await expect(
      workflow.appendDirectiveText({
        identity: IDENTITY,
        ledgerId: LEDGER_ID,
        input: { text: TXN },
      }),
    ).rejects.toMatchObject({ metadata: { residual: "1.00 USD" } });
    expect(ledgerRepo.changeFiles).not.toHaveBeenCalled();
  });

  it("commits anyway when the caller says allowInvalid and means it", async () => {
    const { workflow, ledgerRepo } = fixture({
      files: { "main.bean": "" },
      projectedErrors: [{ message: "some other check failed" }],
    });
    const result = await workflow.appendDirectiveText({
      identity: IDENTITY,
      ledgerId: LEDGER_ID,
      input: { text: TXN, allowInvalid: true },
    });
    expect(result.newErrors).toHaveLength(1);
    expect(ledgerRepo.changeFiles).toHaveBeenCalled();
  });

  it("leaves the repository untouched on a dry run, and returns the diff", async () => {
    const { workflow, ledgerRepo } = fixture({
      files: { "main.bean": 'option "title" "T"\n' },
    });
    const result = await workflow.appendDirectiveText({
      identity: IDENTITY,
      ledgerId: LEDGER_ID,
      input: { text: TXN, dryRun: true },
    });
    expect(ledgerRepo.changeFiles).not.toHaveBeenCalled();
    expect(result.dryRun).toBe(true);
    expect(result.wrote).toEqual([]);
    expect(result.diff[0].diff).toContain("Cafe");
  });

  it("refuses an unsafe explicit path before reading anything", async () => {
    const { workflow, ledgerRepo } = fixture();
    await expect(
      workflow.appendDirectiveText({
        identity: IDENTITY,
        ledgerId: LEDGER_ID,
        input: { text: TXN, path: "../escape.bean" },
      }),
    ).rejects.toThrow();
    expect(ledgerRepo.getFilesContent).not.toHaveBeenCalled();
  });

  it("refuses more directives than one call may carry", async () => {
    const { workflow, ledgerRepo } = fixture({ files: { "main.bean": "" } });
    await expect(
      workflow.appendDirectiveText({
        identity: IDENTITY,
        ledgerId: LEDGER_ID,
        input: { text: TXN.repeat(MAX_APPENDED_DIRECTIVES + 1) },
      }),
    ).rejects.toThrow(/at most 50/);
    expect(ledgerRepo.getFilesContent).not.toHaveBeenCalled();
  });

  it("reads every routed file in one batched call", async () => {
    const { workflow, ledgerRepo } = fixture({
      files: { "main.bean": "", "txns/2026.bean": "" },
      transactionFile: "txns/{year}.bean",
    });
    await workflow.appendDirectiveText({
      identity: IDENTITY,
      ledgerId: LEDGER_ID,
      input: { text: `${TXN}2026-02-06 open Assets:Cash\n` },
    });
    expect(ledgerRepo.getFilesContent).toHaveBeenCalledTimes(1);
    expect(ledgerRepo.getFilesContent.mock.calls[0][0].paths.sort()).toEqual([
      "main.bean",
      "txns/2026.bean",
    ]);
  });
});
