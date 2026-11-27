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

  it("previews dry_run as invalid instead of refusing, then refuses the commit", async () => {
    const { run, commits } = setup({ projected: [BROKEN] });
    const result = await run({ dry_run: true });
    expect(result).toMatchObject({
      ok: true,
      result: {
        validation: {
          valid: false,
          newErrors: [{ message: "Account Assets:Chekcing was never opened" }],
        },
      },
    });
    expect(commits()).toHaveLength(0);
    // The same request without dry_run is still refused.
    expect(await run({ dry_run: false })).toMatchObject({
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

  it("says the text does not parse when bean-check reports a syntax error", async () => {
    const { run, commits } = setup({
      projected: [
        {
          message: "unexpected input",
          source: { filename: "main.bean", lineno: 1 },
          code: "P0012",
        },
      ],
    });
    const result = await run({ dry_run: false });
    expect(result).toMatchObject({
      ok: false,
      errorCode: "VALIDATION_FAILED",
      errorHint: expect.stringContaining("not valid Beancount"),
    });
    expect(commits()).toHaveLength(0);
  });

  it("projects every touched file, deletions as null, and refuses the whole batch", async () => {
    const ledgerRepo = {
      getFilesContent: jest.fn().mockResolvedValue([
        { path: "a.bean", content: "; a\n", sha: "sa" },
        { path: "b.bean", content: "; b\n", sha: "sb" },
      ]),
      changeFiles: jest.fn().mockResolvedValue(undefined),
      checkProjectedFiles: jest.fn().mockResolvedValue([BROKEN]),
    };
    const result = await executeEditLedgerFiles(
      {
        services: {
          ledgerRepo,
          ledgerData: { getErrors: jest.fn().mockResolvedValue([]) },
        } as any,
        identity: IDENTITY,
        ledgerId: LEDGER_ID,
      },
      {
        description: "tidy",
        files: [
          { operation: "replace", path: "a.bean", content: "; z\n" },
          { operation: "delete", path: "b.bean" },
        ],
        dry_run: false,
      } as any,
    );
    expect(result).toMatchObject({ ok: false, errorCode: "VALIDATION_FAILED" });
    expect(ledgerRepo.checkProjectedFiles).toHaveBeenCalledWith(
      expect.objectContaining({
        overlays: [
          { path: "a.bean", content: "; z\n" },
          { path: "b.bean", content: null },
        ],
      }),
    );
    expect(
      ledgerRepo.changeFiles.mock.calls.filter(([call]) => !call.dryRun),
    ).toHaveLength(0);
  });
});

/**
 * w31/118: an exact-text edit that adds or removes lines moves the lines
 * below it in the text bean-check reads. bean-check here flags every line
 * reading `BAD`; the file has one, below each edit. The preview and the
 * refusal must name it at its line in the file as it stands, whatever shape
 * the edit's line breaks take.
 */
describe("an exact-text edit's new errors at the line in the file as it stands", () => {
  const BAD = (file: string) =>
    file.split(/\r\n|\r|\n/).flatMap((line, index) =>
      line === "BAD"
        ? [
            {
              message: "bad line",
              source: { filename: "a.bean", lineno: index + 1 },
            },
          ]
        : [],
    );

  function run(content: string, files: object[], dryRun: boolean) {
    const ledgerRepo = {
      getFilesContent: jest
        .fn()
        .mockResolvedValue([{ path: "a.bean", content, sha: "sa" }]),
      changeFiles: jest.fn().mockResolvedValue(undefined),
      checkProjectedFiles: jest.fn(
        async ({ overlays }: { overlays: { content: string }[] }) =>
          BAD(overlays[0].content),
      ),
    };
    return executeEditLedgerFiles(
      {
        services: {
          ledgerRepo,
          ledgerData: { getErrors: jest.fn().mockResolvedValue([]) },
        } as never,
        identity: IDENTITY,
        ledgerId: LEDGER_ID,
      },
      {
        description: "edit",
        files: files.map((file) => ({
          operation: "update",
          path: "a.bean",
          ...file,
        })),
        dry_run: dryRun,
      } as never,
    );
  }

  const FILE = "one\ntwo\nthree\n\nBAD\n";
  it.each([
    [
      "one line into three",
      FILE,
      [{ old_string: "two", new_string: "2a\n2b\n2c" }],
    ],
    [
      "three lines into one",
      FILE,
      [{ old_string: "one\ntwo\nthree", new_string: "123" }],
    ],
    ["a whole line cut", FILE, [{ old_string: "two\n", new_string: "" }]],
    [
      "two lines merged",
      FILE,
      [{ old_string: "one\ntwo", new_string: "onetwo" }],
    ],
    [
      "a break cut from the line's start",
      FILE,
      [{ old_string: "\ntwo", new_string: "" }],
    ],
    ["a line split mid-word", FILE, [{ old_string: "hr", new_string: "h\nr" }]],
    [
      "lines added after a line's break",
      FILE,
      [{ old_string: "one\n", new_string: "one\nx\ny\n" }],
    ],
    [
      "lines added before a line's text",
      FILE,
      [{ old_string: "th", new_string: "x\ny\nth" }],
    ],
    [
      "the file's first text",
      FILE,
      [{ old_string: "one", new_string: "zero\none" }],
    ],
    [
      "an edit that keeps the count",
      FILE,
      [{ old_string: "two", new_string: "TWO" }],
    ],
    [
      "an edit below the error",
      FILE + "tail\n",
      [{ old_string: "tail", new_string: "a\nb" }],
    ],
    [
      "CRLF lines into more",
      "one\r\ntwo\r\n\r\nBAD\r\n",
      [{ old_string: "two\r\n", new_string: "2a\r\n2b\r\n" }],
    ],
    [
      "chained edits, each in the text the last produced",
      FILE,
      [
        { old_string: "one", new_string: "one\nx\ny" },
        { old_string: "x\ny\ntwo\n", new_string: "" },
        { old_string: "three", new_string: "3\n3\n3" },
      ],
    ],
  ])("%s", async (_name, content, files) => {
    const current = `a.bean:${BAD(content)[0].source.lineno}`;
    const preview = await run(content, files, true);
    expect(preview).toMatchObject({
      ok: true,
      result: {
        validation: { newErrors: [{ message: "bad line", source: current }] },
      },
    });
    const refused = await run(content, files, false);
    expect(refused).toMatchObject({
      ok: false,
      errorCode: "VALIDATION_FAILED",
    });
    expect((refused as { error: string }).error.match(/a\.bean:\d+/g)).toEqual([
      current,
    ]);
  });

  it("keeps the written line of an error the edit writes", async () => {
    const preview = await run(
      "one\ntwo\n",
      [{ old_string: "one", new_string: "one\nx\nBAD" }],
      true,
    );
    expect(preview).toMatchObject({
      result: { validation: { newErrors: [{ source: "a.bean:3" }] } },
    });
  });

  it("maps nothing in a file the batch also writes whole", async () => {
    const preview = await run(
      FILE,
      [
        { operation: "replace", content: "x\ny\n" + FILE },
        { old_string: "two", new_string: "TWO" },
      ],
      true,
    );
    expect(preview).toMatchObject({
      result: { validation: { newErrors: [{ source: "a.bean:7" }] } },
    });
  });
});
