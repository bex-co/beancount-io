import type { IFavaClientFactory } from "@/foundation/clients/fava-client-factory";
import { LedgerRepoService } from "@/features/ledger/service/ledger-repo-service";
import { AuthorizationService } from "@/server/api/authorization";
import type { Identity } from "@/server/api/identity";
import { BadUserInputError } from "@/shared/errors";
import { DirectiveAppendWorkflow } from "../directive-append-workflow";

const BEFORE_SHA = "a".repeat(40);
const LIMIT = 1024 * 1024;
const LEDGER_ID = "synthetic/size-check";
const IDENTITY: Identity = {
  userId: "usr_synthetic",
  method: "oauth",
  scopes: new Set(["ledger.read", "ledger.write"]),
};
const TRANSACTION = [
  '2026-10-15 * "Cafe" "Coffee"',
  "  Expenses:Food   4.50 USD",
  "  Assets:Cash    -4.50 USD",
  "",
].join("\n");

function fixture(before: string) {
  const relationship = jest.fn().mockResolvedValue(true);
  const auth = new AuthorizationService({ check: relationship }, jest.fn());
  const getLedgerFilesContent = jest.fn().mockResolvedValue({
    data: {
      success: true,
      data: [
        {
          path: "main.bean",
          type: "file",
          sha: BEFORE_SHA,
          encoding: "base64",
          content: Buffer.from(before).toString("base64"),
        },
      ],
    },
  });
  const checkProjectedErrors = jest.fn().mockResolvedValue({
    data: { success: true, data: [] },
  });
  const changeLedgerFiles = jest.fn().mockResolvedValue({
    data: { success: true, data: null },
  });
  const factory = {
    getPublicApiClient: jest.fn().mockResolvedValue({
      ledgers: { getLedgerFilesContent, changeLedgerFiles },
      reports: {
        checkProjectedErrors,
        getLedgerBcioOptions: jest.fn().mockResolvedValue({
          data: { success: true, data: { default_file: "main.bean" } },
        }),
      },
    }),
  };
  const repo = new LedgerRepoService(
    factory as unknown as IFavaClientFactory,
    auth,
  );
  const append = new DirectiveAppendWorkflow(
    repo,
    factory as unknown as IFavaClientFactory,
  );
  return {
    repo,
    append,
    getLedgerFilesContent,
    checkProjectedErrors,
    changeLedgerFiles,
    relationship,
  };
}

describe("explicit file-write size versus generated directive append", () => {
  it.each([
    ["ASCII", "x".repeat(LIMIT + 1)],
    ["multibyte UTF-8", `${"€".repeat(349525)}ab`],
  ])(
    "rejects an oversized explicit %s replacement before committing it",
    async (_label, content) => {
      const { repo, changeLedgerFiles } = fixture("");
      expect(Buffer.byteLength(content, "utf8")).toBe(LIMIT + 1);
      await expect(
        repo.changeFiles({
          ledgerId: LEDGER_ID,
          identity: IDENTITY,
          operations: [
            {
              operation: "update",
              path: "main.bean",
              sha: BEFORE_SHA,
              content,
            },
          ],
          message: "Explicit replacement",
        }),
      ).rejects.toBeInstanceOf(BadUserInputError);
      expect(changeLedgerFiles).not.toHaveBeenCalled();
    },
  );

  it("accepts an explicit replacement at exactly 1 MiB of UTF-8 rather than counting characters", async () => {
    const { repo, changeLedgerFiles } = fixture("");
    const content = `${"€".repeat(349525)}x`;
    expect(Buffer.byteLength(content, "utf8")).toBe(LIMIT);
    await repo.changeFiles({
      ledgerId: LEDGER_ID,
      identity: IDENTITY,
      operations: [
        {
          operation: "update",
          path: "main.bean",
          sha: BEFORE_SHA,
          content,
        },
      ],
      message: "Explicit at-limit replacement",
    });
    expect(changeLedgerFiles).toHaveBeenCalledTimes(1);
    const encoded = changeLedgerFiles.mock.calls[0][2].files[0].content;
    expect(Buffer.from(encoded, "base64")).toEqual(
      Buffer.from(content, "utf8"),
    );
  });

  it("allows a small directive append to merge into an existing 1 MiB file", async () => {
    const before = `;${"x".repeat(LIMIT - 2)}\n`;
    expect(Buffer.byteLength(before)).toBe(LIMIT);
    const {
      append,
      getLedgerFilesContent,
      checkProjectedErrors,
      changeLedgerFiles,
    } = fixture(before);
    const result = await append.appendDirectiveText({
      ledgerId: LEDGER_ID,
      identity: IDENTITY,
      input: { text: TRANSACTION },
    });

    expect(result).toMatchObject({ success: true, count: 1, errorsAfter: 0 });
    expect(getLedgerFilesContent).toHaveBeenCalledTimes(1);
    expect(checkProjectedErrors).toHaveBeenCalledTimes(2);
    expect(changeLedgerFiles).toHaveBeenCalledTimes(1);
    const committed = changeLedgerFiles.mock.calls[0][2];
    expect(committed.files).toHaveLength(1);
    expect(committed.files[0]).toMatchObject({
      operation: "update",
      path: "main.bean",
      sha: BEFORE_SHA,
    });
    const merged = Buffer.from(committed.files[0].content, "base64").toString(
      "utf8",
    );
    expect(merged).toBe(`${before}\n${TRANSACTION}`);
    expect(Buffer.byteLength(merged)).toBeGreaterThan(LIMIT);
    const projection = checkProjectedErrors.mock.calls.find(
      (call) => call[2].files.length > 0,
    )![2];
    expect(projection.files).toEqual([
      { path: "main.bean", content: committed.files[0].content },
    ]);
  });
});
