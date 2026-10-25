import { DirectiveAppendWorkflow } from "../directive-append-workflow";
import { MAX_APPENDED_DIRECTIVES } from "@/features/ledger/utils/directive-text-contract";
import type { Identity } from "@/server/api/identity";
import { ResourceLimitReachedError } from "@/shared/errors";

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

type BeanError = {
  message: string;
  source?: { filename: string; lineno: number };
};

const TXN = [
  '2026-02-05 * "Cafe" "Coffee"',
  "  Expenses:Food    4.50 USD",
  "  Assets:Cash     -4.50 USD",
  "",
].join("\n");

function fixture(
  options: {
    files?: Record<string, string>;
    /** The ledger's include closure; every fixture file unless given. */
    sourceFiles?: string[];
    /** Files whose bytes are not valid UTF-8, as the repo service marks them. */
    lossy?: string[];
    transactionFile?: string | null;
    projectedErrors?: BeanError[];
    /** The ledger's errors before the write (the projection of no change). */
    baselineErrors?: BeanError[];
    /** How the ledger locates committed entries; echoes `path:line` unless set. */
    locate?: "throws" | "misses";
    /** Files the ledger's include closure leaves out; none unless set. */
    unloaded?: string[];
    /** The closure lookup fails, as against a ledger without the route. */
    closureFails?: boolean;
    /** What a preview asks about the directive limit; none unless set. */
    limitPreview?: { assertRoom: jest.Mock };
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
          ...(options.lossy?.includes(path) && { lossy: true }),
        })),
    ),
    checkProjectedFiles: jest.fn(
      async ({ overlays }: { overlays: unknown[] }) =>
        overlays.length === 0
          ? (options.baselineErrors ?? [])
          : (options.projectedErrors ?? []),
    ),
    changeGeneratedFiles: jest.fn(
      async (_params: { operations: { path: string; content?: string }[] }) =>
        undefined,
    ),
    projectedSourceFiles: jest.fn(
      async (params: { overlays: { path: string; content: string }[] }) => {
        if (options.closureFails) throw new Error("404 Not Found");
        return [
          ...files.keys(),
          ...params.overlays.map((overlay) => overlay.path),
        ].filter((path) => !options.unloaded?.includes(path));
      },
    ),
    projectedEntryHashes: jest.fn(
      async (params: {
        overlays: { path: string; content: string }[];
        locations: { path: string; line: number }[];
      }) => {
        if (options.locate === "throws") throw new Error("ledger down");
        return params.locations.map(({ path, line }, index) =>
          options.locate === "misses" && index > 0 ? null : `${path}:${line}`,
        );
      },
    ),
  };
  const favaClientFactory = {
    getPublicApiClient: async () => ({
      reports: {
        getLedgerSourceFiles: async () => ({
          data: {
            success: true,
            data: options.sourceFiles ?? [...files.keys()],
          },
        }),
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
      options.limitPreview as never,
    ),
  };
}

describe("DirectiveAppendWorkflow", () => {
  // w23/030: inserting re-encoded the whole lossy text, so every byte that was
  // not valid UTF-8 was committed back as U+FFFD.
  it.each([false, true])(
    "refuses a target that is not valid UTF-8 (dryRun %p)",
    async (dryRun) => {
      const { workflow, ledgerRepo } = fixture({
        files: { "latin1.bean": "; Caf\uFFFD\n" },
        lossy: ["latin1.bean"],
      });
      await expect(
        workflow.appendDirectiveText({
          identity: IDENTITY,
          ledgerId: LEDGER_ID,
          input: { text: TXN, path: "latin1.bean", dryRun },
        }),
      ).rejects.toMatchObject({
        category: "BAD_USER_INPUT",
        message: expect.stringContaining("latin1.bean is not valid UTF-8"),
      });
      expect(ledgerRepo.changeGeneratedFiles).not.toHaveBeenCalled();
    },
  );

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
    expect(ledgerRepo.changeGeneratedFiles).toHaveBeenCalledWith(
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
    const { operations } = ledgerRepo.changeGeneratedFiles.mock.calls[0][0];
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
    expect(ledgerRepo.changeGeneratedFiles).toHaveBeenCalledWith(
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
    expect(ledgerRepo.changeGeneratedFiles).not.toHaveBeenCalled();
  });

  // w23/034: inserting above an existing error moved it down, and keying the
  // diff on file:line read it as one the append introduced.
  describe("with an error the ledger already has below the insertion", () => {
    const missing = (filename: string, lineno: number) => ({
      message: "Document file not found: receipts/2026.pdf",
      source: { filename, lineno },
    });

    it.each([false, true])(
      "does not count the moved error as new (dryRun %p)",
      async (dryRun) => {
        const { workflow, ledgerRepo } = fixture({
          files: { "main.bean": "" },
          baselineErrors: [missing("main.bean", 93)],
          projectedErrors: [missing("main.bean", 97)],
        });
        const result = await workflow.appendDirectiveText({
          identity: IDENTITY,
          ledgerId: LEDGER_ID,
          input: { text: TXN, dryRun },
        });
        expect(result.newErrors).toEqual([]);
        expect(ledgerRepo.changeGeneratedFiles).toHaveBeenCalledTimes(
          dryRun ? 0 : 1,
        );
      },
    );

    it.each([
      [
        "a second copy of it",
        [missing("main.bean", 97), missing("main.bean", 4)],
      ],
      [
        "the same message in another file",
        [missing("main.bean", 97), missing("txns.bean", 2)],
      ],
    ])("still refuses %s", async (_case, projectedErrors) => {
      const { workflow, ledgerRepo } = fixture({
        files: { "main.bean": "" },
        baselineErrors: [missing("main.bean", 93)],
        projectedErrors,
      });
      await expect(
        workflow.appendDirectiveText({
          identity: IDENTITY,
          ledgerId: LEDGER_ID,
          input: { text: TXN },
        }),
      ).rejects.toMatchObject({ category: "VALIDATION_FAILED" });
      expect(ledgerRepo.changeGeneratedFiles).not.toHaveBeenCalled();
    });
  });

  // w23/041: the untagged entry went to its date position and an empty
  // pushtag/poptag pair to the end of the file.
  it("inserts a tag-stack entry at its date position, tagged, with no stray statements", async () => {
    const { workflow, ledgerRepo } = fixture({
      files: {
        "main.bean":
          "2026-01-01 open Assets:Cash\n\n2026-03-01 open Expenses:Food\n",
      },
    });
    await workflow.appendDirectiveText({
      identity: IDENTITY,
      ledgerId: LEDGER_ID,
      input: { text: `pushtag #trip\n${TXN}poptag #trip\n` },
    });
    const { operations } = ledgerRepo.changeGeneratedFiles.mock.calls[0][0];
    const content = operations[0].content as string;
    expect(content).not.toMatch(/pushtag|poptag/);
    expect(
      content.indexOf('2026-02-05 * "Cafe" "Coffee" #trip'),
    ).toBeGreaterThan(content.indexOf("2026-01-01 open"));
    expect(content.indexOf("#trip")).toBeLessThan(
      content.indexOf("2026-03-01 open"),
    );
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
    expect(ledgerRepo.changeGeneratedFiles).toHaveBeenCalled();
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
    expect(ledgerRepo.changeGeneratedFiles).not.toHaveBeenCalled();
    expect(result.dryRun).toBe(true);
    expect(result.wrote).toEqual([]);
    expect(result.diff[0].diff).toContain("Cafe");
  });

  // w5/904: a preview exists so the caller can approve what will happen, so it
  // refuses what the commit's directive limit would.
  describe("directive limit", () => {
    const refusal = () =>
      new ResourceLimitReachedError("Directive", 1000, 1001, "over the limit");

    it("refuses a dry run the commit would refuse, writing nothing", async () => {
      const limitPreview = {
        assertRoom: jest.fn().mockRejectedValue(refusal()),
      };
      const { workflow, ledgerRepo } = fixture({
        files: { "main.bean": 'option "title" "T"\n' },
        limitPreview,
      });

      await expect(
        workflow.appendDirectiveText({
          identity: IDENTITY,
          ledgerId: LEDGER_ID,
          input: { text: TXN, dryRun: true },
        }),
      ).rejects.toBeInstanceOf(ResourceLimitReachedError);

      expect(limitPreview.assertRoom).toHaveBeenCalledWith(
        expect.objectContaining({ owner: "alice", repo: "main", adding: 1 }),
      );
      expect(ledgerRepo.changeGeneratedFiles).not.toHaveBeenCalled();
    });

    it("previews normally when there is room", async () => {
      const limitPreview = {
        assertRoom: jest.fn().mockResolvedValue(undefined),
      };
      const { workflow } = fixture({
        files: { "main.bean": 'option "title" "T"\n' },
        limitPreview,
      });

      const result = await workflow.appendDirectiveText({
        identity: IDENTITY,
        ledgerId: LEDGER_ID,
        input: { text: TXN, dryRun: true },
      });

      expect(result.dryRun).toBe(true);
    });

    it("leaves a real write to the ledger service's own check", async () => {
      const limitPreview = { assertRoom: jest.fn() };
      const { workflow } = fixture({
        files: { "main.bean": 'option "title" "T"\n' },
        limitPreview,
      });

      await workflow.appendDirectiveText({
        identity: IDENTITY,
        ledgerId: LEDGER_ID,
        input: { text: TXN },
      });

      expect(limitPreview.assertRoom).not.toHaveBeenCalled();
    });
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

  // w23/081: the projected bean-check runs the engine, which rounds instead
  // of failing, so a 29-digit amount would commit and read back changed.
  it.each([false, true])(
    "refuses an amount past 28 digits before reading anything (dryRun %p)",
    async (dryRun) => {
      const { workflow, ledgerRepo } = fixture({
        files: { "main.bean": "" },
      });
      const text = [
        '2021-01-02 * "raw"',
        "  Assets:Cash  999999999999999999999999999.99 USD",
        "  Equity:Initial",
        "",
      ].join("\n");
      await expect(
        workflow.appendDirectiveText({
          identity: IDENTITY,
          ledgerId: LEDGER_ID,
          input: { text, dryRun },
        }),
      ).rejects.toMatchObject({
        category: "BAD_USER_INPUT",
        message: expect.stringContaining(
          "999999999999999999999999999.99 has more than 28 significant digits",
        ),
      });
      expect(ledgerRepo.getFilesContent).not.toHaveBeenCalled();
      expect(ledgerRepo.changeGeneratedFiles).not.toHaveBeenCalled();
    },
  );

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

  /** w4/m38: early-year text keeps its date in source and routing. */
  it.each([
    ["0001-01-01", "txns/0001.bean"],
    ["0099-08-11", "txns/0099.bean"],
    ["0100-08-11", "txns/0100.bean"],
  ])("routes and writes a %s transaction to %s once", async (date, path) => {
    const { workflow, ledgerRepo } = fixture({
      transactionFile: "txns/{year}.bean",
    });
    const text = TXN.replace("2026-02-05", date);
    const dry = await workflow.appendDirectiveText({
      identity: IDENTITY,
      ledgerId: LEDGER_ID,
      input: { text, dryRun: true },
    });
    expect(dry.dryRun).toBe(true);
    expect(dry.diff[0].diff).toContain(`${date} * "Cafe"`);
    expect(ledgerRepo.changeGeneratedFiles).not.toHaveBeenCalled();

    await workflow.appendDirectiveText({
      identity: IDENTITY,
      ledgerId: LEDGER_ID,
      input: { text },
    });
    expect(ledgerRepo.changeGeneratedFiles).toHaveBeenCalledTimes(1);
    const { operations } = ledgerRepo.changeGeneratedFiles.mock.calls[0][0];
    expect(operations).toEqual([
      expect.objectContaining({ operation: "create", path }),
    ]);
    expect(operations[0].content).toContain(`${date} * "Cafe"`);
  });

  it("refuses year 0000 text before reading anything", async () => {
    const { workflow, ledgerRepo } = fixture();
    await expect(
      workflow.appendDirectiveText({
        identity: IDENTITY,
        ledgerId: LEDGER_ID,
        input: { text: TXN.replace("2026-02-05", "0000-02-05") },
      }),
    ).rejects.toThrow(/not a calendar date/);
    expect(ledgerRepo.getFilesContent).not.toHaveBeenCalled();
  });

  // w23/060: the result said `entryHashes: []`, so an agent could not act on
  // what it had just written without guessing through a listing.
  describe("entry hashes", () => {
    const at = (date: string, payee: string) =>
      TXN.replace("2026-02-05", date).replace("Cafe", payee);
    const EXISTING = [at("2026-01-10", "Jan"), at("2026-03-10", "Mar")].join(
      "\n",
    );

    it("locates each committed directive where it landed, in text order", async () => {
      const { workflow, ledgerRepo } = fixture({
        files: { "main.bean": EXISTING },
      });
      const result = await workflow.appendDirectiveText({
        identity: IDENTITY,
        ledgerId: LEDGER_ID,
        input: {
          text: `${at("2026-04-01", "Apr")}\n${at("2026-02-01", "Feb")}`,
        },
      });

      const [{ overlays, locations }] =
        ledgerRepo.projectedEntryHashes.mock.calls[0]!;
      const committed =
        ledgerRepo.changeGeneratedFiles.mock.calls[0]![0].operations[0]!;
      expect(overlays).toEqual([
        { path: "main.bean", content: committed.content },
      ]);
      expect(locations).toEqual(result.wrote);
      const lines = committed.content!.split("\n");
      expect(locations.map(({ line }) => lines[line - 1])).toEqual([
        '2026-04-01 * "Apr" "Coffee"',
        '2026-02-01 * "Feb" "Coffee"',
      ]);
      expect(result.entryHashes).toEqual(
        locations.map(({ path, line }) => `${path}:${line}`),
      );
    });

    it("locates nothing on a dry run", async () => {
      const { workflow, ledgerRepo } = fixture({
        files: { "main.bean": EXISTING },
      });
      const result = await workflow.appendDirectiveText({
        identity: IDENTITY,
        ledgerId: LEDGER_ID,
        input: { text: at("2026-02-01", "Feb"), dryRun: true },
      });
      expect(result.entryHashes).toEqual([]);
      expect(ledgerRepo.projectedEntryHashes).not.toHaveBeenCalled();
    });

    it.each(["throws", "misses"] as const)(
      "keeps the commit and answers no hashes when the lookup %s",
      async (locate) => {
        const { workflow, ledgerRepo } = fixture({
          files: { "main.bean": EXISTING },
          locate,
        });
        const result = await workflow.appendDirectiveText({
          identity: IDENTITY,
          ledgerId: LEDGER_ID,
          input: {
            text: `${at("2026-04-01", "Apr")}\n${at("2026-02-01", "Feb")}`,
          },
        });
        expect(ledgerRepo.changeGeneratedFiles).toHaveBeenCalledTimes(1);
        expect(result.wrote).toHaveLength(2);
        expect(result.entryHashes).toEqual([]);
      },
    );
  });
  // w23/062: a routed write to a file nothing included committed directives
  // no report loaded, and its check passed because it never loaded them.
  describe("routed files outside the include closure", () => {
    const MAIN =
      'include "txns/2025.bean"\n\n2020-01-01 open Assets:Cash USD\n';
    const ledger = (unloaded: string[]) =>
      fixture({
        files: { "main.bean": MAIN, "txns/2025.bean": "" },
        transactionFile: "txns/{year}.bean",
        unloaded,
      });

    it("includes a new year's file from the entry point in the same commit", async () => {
      const { workflow, ledgerRepo } = ledger(["txns/2026.bean"]);
      const result = await workflow.appendDirectiveText({
        identity: IDENTITY,
        ledgerId: LEDGER_ID,
        input: { text: TXN },
      });

      expect(result.message).toBe(
        "Added 1 directive to txns/2026.bean; main.bean now includes txns/2026.bean",
      );
      // Only the file the write creates is projected; the rest is the repo.
      expect(ledgerRepo.projectedSourceFiles).toHaveBeenCalledWith(
        expect.objectContaining({
          overlays: [{ path: "txns/2026.bean", content: "" }],
        }),
      );
      const { operations } = ledgerRepo.changeGeneratedFiles.mock.calls[0]![0];
      expect(operations).toEqual([
        expect.objectContaining({
          operation: "create",
          path: "txns/2026.bean",
        }),
        expect.objectContaining({
          operation: "update",
          path: "main.bean",
          sha: "sha-main.bean",
          content:
            'include "txns/2025.bean"\ninclude "txns/2026.bean"\n\n2020-01-01 open Assets:Cash USD\n',
        }),
      ]);
      // The check loads what the commit will: the include and the new file.
      const projected = ledgerRepo.checkProjectedFiles.mock.calls
        .map(([call]) => call as { overlays: { path: string }[] })
        .find(({ overlays }) => overlays.length > 0)!;
      expect(projected.overlays.map(({ path }) => path)).toEqual([
        "txns/2026.bean",
        "main.bean",
      ]);
    });

    it("previews the include without committing", async () => {
      const { workflow, ledgerRepo } = ledger(["txns/2026.bean"]);
      const result = await workflow.appendDirectiveText({
        identity: IDENTITY,
        ledgerId: LEDGER_ID,
        input: { text: TXN, dryRun: true },
      });
      expect(result.message).toBe(
        "Would add 1 directive to txns/2026.bean; main.bean would include txns/2026.bean",
      );
      expect(
        result.diff.find(({ path }) => path === "main.bean")?.diff,
      ).toContain('+include "txns/2026.bean"');
      expect(ledgerRepo.changeGeneratedFiles).not.toHaveBeenCalled();
    });

    it("leaves the entry point alone when an include already covers the file", async () => {
      const { workflow, ledgerRepo } = ledger([]);
      const result = await workflow.appendDirectiveText({
        identity: IDENTITY,
        ledgerId: LEDGER_ID,
        input: { text: TXN },
      });
      expect(result.message).toBe("Added 1 directive to txns/2026.bean");
      const { operations } = ledgerRepo.changeGeneratedFiles.mock.calls[0]![0];
      expect(operations.map(({ path }) => path)).toEqual(["txns/2026.bean"]);
    });

    it("keeps directive lines right when the entry point is also a target", async () => {
      const { workflow, ledgerRepo } = fixture({
        files: { "main.bean": MAIN, "txns/2025.bean": "" },
        transactionFile: "txns/{year}.bean",
        unloaded: ["txns/2026.bean"],
      });
      const result = await workflow.appendDirectiveText({
        identity: IDENTITY,
        ledgerId: LEDGER_ID,
        input: { text: `2026-01-01 open Expenses:Food USD\n\n${TXN}` },
      });
      const committed = new Map(
        ledgerRepo.changeGeneratedFiles.mock.calls[0]![0].operations.map(
          (operation) => [operation.path, operation.content!],
        ),
      );
      expect(result.wrote.map(({ path }) => path).sort()).toEqual([
        "main.bean",
        "txns/2026.bean",
      ]);
      for (const { path, line } of result.wrote) {
        expect(committed.get(path)!.split("\n")[line - 1]).toMatch(
          /^2026-0[12]-0[15] /,
        );
      }
      expect(committed.get("main.bean")).toContain('include "txns/2026.bean"');
    });

    it("appends as before when the ledger cannot list the closure", async () => {
      const { workflow, ledgerRepo } = fixture({
        files: { "main.bean": MAIN, "txns/2025.bean": "" },
        transactionFile: "txns/{year}.bean",
        closureFails: true,
      });
      const result = await workflow.appendDirectiveText({
        identity: IDENTITY,
        ledgerId: LEDGER_ID,
        input: { text: TXN },
      });
      expect(result.message).toBe("Added 1 directive to txns/2026.bean");
      const { operations } = ledgerRepo.changeGeneratedFiles.mock.calls[0]![0];
      expect(operations.map(({ path }) => path)).toEqual(["txns/2026.bean"]);
    });

    it("does not look up the closure for a named path", async () => {
      const { workflow, ledgerRepo } = ledger([]);
      await workflow.appendDirectiveText({
        identity: IDENTITY,
        ledgerId: LEDGER_ID,
        input: { text: TXN, path: "txns/2025.bean" },
      });
      expect(ledgerRepo.projectedSourceFiles).not.toHaveBeenCalled();
    });
  });
});
