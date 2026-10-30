import { executeEditLedgerFiles } from "../edit-ledger-files-tool";
import type { Identity } from "@/server/api/identity";

/**
 * w23/m15: a file write that adds bean-check errors the ledger did not have
 * is refused like an entry write, on commit and on `dry_run` alike, unless
 * `allow_invalid` says otherwise. Errors the ledger already had never block.
 */
const IDENTITY: Identity = {
  userId: "user-123",
  method: "oauth",
  scopes: new Set(["ledger.read", "ledger.write"]),
};
const LEDGER_ID = "alice/personal";

const BROKEN = {
  message: "Account Assets:Chekcing was never opened",
  source: { filename: "main.bean", lineno: 3 },
};

function setup(opts: { current?: unknown[]; projected?: unknown[] }) {
  const ledgerRepo = {
    getFilesContent: jest
      .fn()
      .mockResolvedValue([
        { path: "main.bean", content: "; a\n", sha: "sha1" },
      ]),
    changeFiles: jest.fn().mockResolvedValue(undefined),
    checkProjectedFiles: jest.fn().mockResolvedValue(opts.projected ?? []),
  };
  const ledgerData = {
    getErrors: jest.fn().mockResolvedValue(opts.current ?? []),
  };
  const run = (input: Record<string, unknown>) =>
    executeEditLedgerFiles(
      {
        services: { ledgerRepo, ledgerData } as any,
        identity: IDENTITY,
        ledgerId: LEDGER_ID,
      },
      {
        description: "edit",
        files: [
          { operation: "replace", path: "main.bean", content: "; broken\n" },
        ],
        ...input,
      } as any,
    );
  const commits = () =>
    ledgerRepo.changeFiles.mock.calls.filter(([call]) => !call.dryRun);
  return { run, commits };
}

describe("file writes gate on new bean-check errors", () => {
  it("refuses a commit that adds an error and writes nothing", async () => {
    const { run, commits } = setup({ projected: [BROKEN] });
    const result = await run({ dry_run: false });
    expect(result).toMatchObject({
      ok: false,
      errorCode: "VALIDATION_FAILED",
      error: expect.stringContaining("Assets:Chekcing was never opened"),
    });
    expect(commits()).toHaveLength(0);
  });

  it("refuses dry_run the same way", async () => {
    const { run, commits } = setup({ projected: [BROKEN] });
    const result = await run({ dry_run: true });
    expect(result).toMatchObject({
      ok: false,
      errorCode: "VALIDATION_FAILED",
    });
    expect(commits()).toHaveLength(0);
  });

  it("commits deliberately with allow_invalid", async () => {
    const { run, commits } = setup({ projected: [BROKEN] });
    const result = await run({ dry_run: false, allow_invalid: true });
    expect(result).toMatchObject({ ok: true });
    expect(commits()).toHaveLength(1);
  });

  it("accepts the allowInvalid spelling and refuses a split pair", async () => {
    const accepted = setup({ projected: [BROKEN] });
    expect(await accepted.run({ allowInvalid: true })).toMatchObject({
      ok: true,
    });
    const split = setup({ projected: [BROKEN] });
    await expect(
      split.run({ allow_invalid: true, allowInvalid: false }),
    ).rejects.toThrow(/not one true and the other false/);
    expect(split.commits()).toHaveLength(0);
  });

  it("never blocks on errors the ledger already had", async () => {
    const { run, commits } = setup({ current: [BROKEN], projected: [BROKEN] });
    expect(await run({ dry_run: false })).toMatchObject({ ok: true });
    expect(commits()).toHaveLength(1);
  });

  it("lets a write that fixes errors through", async () => {
    const { run, commits } = setup({ current: [BROKEN], projected: [] });
    expect(await run({ dry_run: false })).toMatchObject({ ok: true });
    expect(commits()).toHaveLength(1);
  });
});
