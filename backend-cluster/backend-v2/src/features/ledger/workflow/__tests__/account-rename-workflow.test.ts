import { AccountRenameWorkflow } from "../account-rename-workflow";
import type { Identity } from "@/server/api/identity";
import { ConflictError, ForbiddenError } from "@/shared/errors";

/** w1/m43/t002 — the rename reads the loaded files, gates the projection, and commits once. */

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

const MAIN = [
  'option "operating_currency" "USD"',
  'include "2026.bean"',
  "2026-01-01 open Assets:Bank:Checking USD",
  "2026-01-01 open Assets:Bank:Checking:Joint USD",
  "2026-01-01 open Expenses:Coffee USD",
  "2026-01-01 open Equity:Opening USD",
  "",
].join("\n");
const YEAR = [
  '2026-02-01 * "Coffee" "Assets:Bank:Checking stays in strings"',
  "  Expenses:Coffee  3.00 USD",
  "  Assets:Bank:Checking ; and in comments: Assets:Bank:Checking",
  "2026-02-28 balance Assets:Bank:Checking  -3.00 USD",
  "",
].join("\n");

const BUDGET =
  '2026-01-01 custom "budget" Assets:Bank:Checking:Joint "monthly" 50 USD\n';

function fixture(
  options: {
    files?: Record<string, string>;
    unloaded?: string[];
    lossy?: string[];
    projectedErrors?: BeanError[];
    baselineErrors?: BeanError[];
    mappings?: {
      id: string;
      plaidItemId: string;
      ledgerAccount: string;
      name: string | null;
    }[];
    remapFails?: boolean;
    forbidden?: boolean;
    /** A file changed between the read and the commit. */
    stale?: boolean;
  } = {},
) {
  const files = new Map(
    Object.entries(
      options.files ?? {
        "main.bean": MAIN,
        "2026.bean": YEAR,
        "budget.bean": BUDGET,
      },
    ),
  );
  const ledgerRepo = {
    projectedSourceFiles: jest.fn(async () =>
      [...files.keys()].filter((path) => !options.unloaded?.includes(path)),
    ),
    getFilesContent: jest.fn(async ({ paths }: { paths: string[] }) =>
      paths
        .filter((path) => files.has(path))
        .map((path) => ({
          path,
          content: files.get(path)!,
          sha: `sha-${path}`,
          ...(options.lossy?.includes(path) && { lossy: true as const }),
        })),
    ),
    checkProjectedFiles: jest.fn(async () => options.projectedErrors ?? []),
    changeGeneratedFiles: jest.fn(
      async (_params: {
        operations: {
          path: string;
          content?: string | null;
          sha?: string | null;
        }[];
      }) => {
        if (options.stale) {
          throw new ConflictError(
            "File",
            "2026.bean changed since it was read",
          );
        }
        return { commit: "c0ffee" };
      },
    ),
  };
  const ledgerData = {
    getErrors: jest.fn(async () => options.baselineErrors ?? []),
  };
  const mappings = options.mappings ?? [];
  const bankMappings = {
    list: jest.fn(async () => mappings),
    remap: jest.fn(async (_changes: unknown[]) => {
      if (options.remapFails) throw new Error("db down");
    }),
  };
  const authorization = {
    authorizeOrThrow: jest.fn(async () => {
      if (options.forbidden) throw new ForbiddenError("ledger.files.write");
    }),
  };
  const workflow = new AccountRenameWorkflow(
    ledgerRepo as never,
    ledgerData as never,
    authorization as never,
    bankMappings,
  );
  const rename = (input: {
    from: string;
    to: string;
    dryRun?: boolean;
    allowInvalid?: boolean;
  }) =>
    workflow.renameAccount({ identity: IDENTITY, ledgerId: LEDGER_ID, input });
  return { ledgerRepo, ledgerData, bankMappings, rename };
}

describe("AccountRenameWorkflow (w1/m43)", () => {
  it("renames every loaded file in one commit, with each file's sha", async () => {
    const { ledgerRepo, rename } = fixture();
    const result = await rename({
      from: "Assets:Bank:Checking",
      to: "Assets:Bank:Main",
    });
    expect(ledgerRepo.changeGeneratedFiles).toHaveBeenCalledTimes(1);
    const { operations } = ledgerRepo.changeGeneratedFiles.mock.calls[0][0];
    expect(operations.map((op) => [op.path, op.sha])).toEqual([
      ["main.bean", "sha-main.bean"],
      ["2026.bean", "sha-2026.bean"],
      ["budget.bean", "sha-budget.bean"],
    ]);
    const year = operations.find((op) => op.path === "2026.bean")!.content!;
    expect(year).toContain(
      "  Assets:Bank:Main ; and in comments: Assets:Bank:Checking",
    );
    expect(year).toContain('"Assets:Bank:Checking stays in strings"');
    expect(year).toContain("2026-02-28 balance Assets:Bank:Main  -3.00 USD");
    expect(result).toMatchObject({
      message:
        "Renamed Assets:Bank:Checking to Assets:Bank:Main: 5 lines in 3 files",
      commit: "c0ffee",
      dryRun: false,
      accounts: [
        { from: "Assets:Bank:Checking", to: "Assets:Bank:Main" },
        { from: "Assets:Bank:Checking:Joint", to: "Assets:Bank:Main:Joint" },
      ],
    });
    expect(
      result.files.map((file) => [
        file.path,
        file.changes.map((change) => change.line),
      ]),
    ).toEqual([
      ["main.bean", [3, 4]],
      ["2026.bean", [3, 4]],
      ["budget.bean", [1]],
    ]);
  });

  it("previews the same changes and commits nothing", async () => {
    const { ledgerRepo, rename } = fixture();
    const result = await rename({
      from: "Assets:Bank:Checking",
      to: "Assets:Bank:Main",
      dryRun: true,
    });
    expect(ledgerRepo.changeGeneratedFiles).not.toHaveBeenCalled();
    expect(result.commit).toBeUndefined();
    expect(result.message).toBe(
      "Would rename Assets:Bank:Checking to Assets:Bank:Main: 5 lines in 3 files",
    );
    expect(result.validation.valid).toBe(true);
  });

  it("refuses a rename that adds a bean-check error unless allowInvalid", async () => {
    const newError = {
      message: "Invalid reference to unknown account 'Assets:Bank:Main'",
    };
    const { ledgerRepo, rename } = fixture({ projectedErrors: [newError] });
    await expect(
      rename({ from: "Assets:Bank:Checking", to: "Assets:Bank:Main" }),
    ).rejects.toMatchObject({
      category: "VALIDATION_FAILED",
    });
    expect(ledgerRepo.changeGeneratedFiles).not.toHaveBeenCalled();
    const preview = await rename({
      from: "Assets:Bank:Checking",
      to: "Assets:Bank:Main",
      dryRun: true,
    });
    expect(preview.validation.valid).toBe(false);
    await rename({
      from: "Assets:Bank:Checking",
      to: "Assets:Bank:Main",
      allowInvalid: true,
    });
    expect(ledgerRepo.changeGeneratedFiles).toHaveBeenCalledTimes(1);
  });

  it.each([
    [
      "an invalid target",
      "Assets:Bank:Checking",
      "assets:lower",
      /not a valid account name/,
    ],
    [
      "another root",
      "Assets:Bank:Checking",
      "Liabilities:Bank",
      /changes how every report reads it/,
    ],
    [
      "the same account",
      "Assets:Bank:Checking",
      "Assets:Bank:Checking",
      /the same account/,
    ],
  ])("refuses %s before reading anything", async (_case, from, to, message) => {
    const { ledgerRepo, rename } = fixture();
    await expect(rename({ from, to })).rejects.toThrow(message);
    expect(ledgerRepo.projectedSourceFiles).not.toHaveBeenCalled();
  });

  it("answers FORBIDDEN before judging the request for a credential without write", async () => {
    const { ledgerRepo, rename } = fixture({ forbidden: true });
    await expect(
      rename({ from: "Assets:Bank:Checking", to: "not valid" }),
    ).rejects.toMatchObject({ category: "FORBIDDEN" });
    expect(ledgerRepo.projectedSourceFiles).not.toHaveBeenCalled();
  });

  it("refuses the whole rename when a file changed since the read, moving no mapping", async () => {
    const { bankMappings, rename } = fixture({
      stale: true,
      mappings: [
        {
          id: "pacc_1",
          plaidItemId: "pi_1",
          ledgerAccount: "Assets:Bank:Checking",
          name: "Chase",
        },
      ],
    });
    await expect(
      rename({ from: "Assets:Bank:Checking", to: "Assets:Bank:Main" }),
    ).rejects.toMatchObject({ category: "CONFLICT" });
    expect(bankMappings.remap).not.toHaveBeenCalled();
  });

  it("refuses a rename onto an account the ledger already uses", async () => {
    const { ledgerRepo, rename } = fixture();
    await expect(
      rename({
        from: "Assets:Bank:Checking:Joint",
        to: "Assets:Bank:Checking",
      }),
    ).rejects.toThrow(/Assets:Bank:Checking is already in the ledger/);
    expect(ledgerRepo.changeGeneratedFiles).not.toHaveBeenCalled();
  });

  it("renames a parent onto a name only its descendant shares a prefix with", async () => {
    // Assets:Bank:Checking:Joint -> Assets:Bank:Joint: `Assets:Bank` is a
    // prefix of names in the ledger, but no account is named Assets:Bank:Joint.
    const { rename } = fixture();
    const result = await rename({
      from: "Assets:Bank:Checking:Joint",
      to: "Assets:Bank:Joint",
    });
    expect(result.accounts).toEqual([
      { from: "Assets:Bank:Checking:Joint", to: "Assets:Bank:Joint" },
    ]);
  });

  it("answers NOT_FOUND when no loaded file names the account", async () => {
    const { rename } = fixture({
      unloaded: ["2026.bean"],
      files: { "main.bean": MAIN, "2026.bean": YEAR },
    });
    await expect(
      rename({ from: "Assets:Cash", to: "Assets:Wallet" }),
    ).rejects.toMatchObject({
      category: "NOT_FOUND",
    });
  });

  it("leaves a file the ledger does not load alone", async () => {
    const { ledgerRepo, rename } = fixture({ unloaded: ["2026.bean"] });
    await rename({ from: "Assets:Bank:Checking", to: "Assets:Bank:Main" });
    const { operations } = ledgerRepo.changeGeneratedFiles.mock.calls[0][0];
    expect(operations.map((op) => op.path)).toEqual([
      "main.bean",
      "budget.bean",
    ]);
  });

  it("refuses to rewrite a file that is not valid UTF-8", async () => {
    const { ledgerRepo, rename } = fixture({ lossy: ["2026.bean"] });
    await expect(
      rename({ from: "Assets:Bank:Checking", to: "Assets:Bank:Main" }),
    ).rejects.toThrow(/2026.bean is not valid UTF-8/);
    expect(ledgerRepo.changeGeneratedFiles).not.toHaveBeenCalled();
  });

  describe("bank mappings (t003)", () => {
    const MAPPINGS = [
      {
        id: "pacc_1",
        plaidItemId: "pi_1",
        ledgerAccount: "Assets:Bank:Checking",
        name: "Chase Checking ••1234",
      },
      {
        id: "pacc_2",
        plaidItemId: "pi_2",
        ledgerAccount: "Assets:Bank:Checking:Joint",
        name: null,
      },
      {
        id: "pacc_3",
        plaidItemId: "pi_1",
        ledgerAccount: "Assets:Bank:CheckingOld",
        name: "Chase Old",
      },
      {
        id: "pacc_4",
        plaidItemId: "pi_1",
        ledgerAccount: "Liabilities:Card",
        name: "Chase Card",
      },
    ];

    it("lists the mappings a preview would move and moves nothing", async () => {
      const { bankMappings, rename } = fixture({ mappings: MAPPINGS });
      const result = await rename({
        from: "Assets:Bank:Checking",
        to: "Assets:Bank:Main",
        dryRun: true,
      });
      expect(result.bankMappings).toEqual([
        {
          plaidAccount: "Chase Checking ••1234",
          from: "Assets:Bank:Checking",
          to: "Assets:Bank:Main",
          updated: false,
        },
        {
          plaidAccount: null,
          from: "Assets:Bank:Checking:Joint",
          to: "Assets:Bank:Main:Joint",
          updated: false,
        },
      ]);
      expect(bankMappings.remap).not.toHaveBeenCalled();
    });

    it("moves each mapping of the account or one under it after the commit", async () => {
      const { ledgerRepo, bankMappings, rename } = fixture({
        mappings: MAPPINGS,
      });
      const result = await rename({
        from: "Assets:Bank:Checking",
        to: "Assets:Bank:Main",
      });
      expect(bankMappings.remap).toHaveBeenCalledWith([
        {
          id: "pacc_1",
          plaidItemId: "pi_1",
          ledgerAccount: "Assets:Bank:Main",
        },
        {
          id: "pacc_2",
          plaidItemId: "pi_2",
          ledgerAccount: "Assets:Bank:Main:Joint",
        },
      ]);
      // After the files committed, never before.
      expect(
        ledgerRepo.changeGeneratedFiles.mock.invocationCallOrder[0],
      ).toBeLessThan(bankMappings.remap.mock.invocationCallOrder[0]);
      expect(result.bankMappings.every((mapping) => mapping.updated)).toBe(
        true,
      );
      expect(result.message).toBe(
        "Renamed Assets:Bank:Checking to Assets:Bank:Main: 5 lines in 3 files",
      );
    });

    it("reports the mappings a failed update left behind, and keeps the commit", async () => {
      const { rename } = fixture({ mappings: MAPPINGS, remapFails: true });
      const result = await rename({
        from: "Assets:Bank:Checking",
        to: "Assets:Bank:Main",
      });
      expect(result.commit).toBe("c0ffee");
      expect(result.bankMappings.map((mapping) => mapping.updated)).toEqual([
        false,
        false,
      ]);
      expect(result.message).toMatch(
        /; 2 bank mappings still name Assets:Bank:Checking: map them to Assets:Bank:Main again$/,
      );
    });

    it("does not touch mappings when the rename is refused", async () => {
      const { bankMappings, rename } = fixture({
        mappings: MAPPINGS,
        projectedErrors: [{ message: "new error" }],
      });
      await expect(
        rename({ from: "Assets:Bank:Checking", to: "Assets:Bank:Main" }),
      ).rejects.toMatchObject({
        category: "VALIDATION_FAILED",
      });
      expect(bankMappings.remap).not.toHaveBeenCalled();
    });
  });
});
