import { loadCachedFileMapForRepo } from "@/foundation/clients/load-cached-ledger-file-map";
import { parseLedgerFiles } from "@/foundation/rustledger";
import { LedgerDataService } from "@/features/ledger/service/ledger-data-service";

jest.mock("@/foundation/clients/load-cached-ledger-file-map", () => ({
  loadCachedFileMapForRepo: jest.fn(),
}));

jest.mock("@/foundation/rustledger", () => {
  const actual = jest.requireActual("@/foundation/rustledger");
  return { ...actual, parseLedgerFiles: jest.fn() };
});

const loadMock = loadCachedFileMapForRepo as jest.Mock;
const parseMock = parseLedgerFiles as jest.Mock;

const MAIN = [
  "2020-01-01 open Expenses:Food USD",
  "2020-01-01 open Assets:Cash USD",
  "",
].join("\n");

function service() {
  const giteaClientFactory = { getPublicApiClient: jest.fn() };
  return new LedgerDataService(giteaClientFactory as never, {} as never);
}

beforeEach(() => {
  loadMock.mockReset();
  parseMock.mockReset();
  loadMock.mockResolvedValue({
    files: { "main.bean": MAIN },
    entryPoint: "main.bean",
    repoPaths: ["main.bean"],
  });
  parseMock.mockResolvedValue({ errors: [] });
});

const b64 = (text: string) => Buffer.from(text, "utf8").toString("base64");

describe("checkProjectedErrors", () => {
  it("overlays updated contents onto the repo file map", async () => {
    const extra = "2026-09-01 *\n  Expenses:Food 1.00 USD\n  Assets:Cash -1.00 USD\n";
    await service().checkProjectedErrors({
      ledgerId: "alice/main",
      userId: "user-1",
      overlays: [{ path: "main.bean", content: b64(`${MAIN}\n${extra}`) }],
    });
    expect(parseMock).toHaveBeenCalledTimes(1);
    expect(parseMock.mock.calls[0]?.[0]).toEqual({
      "main.bean": `${MAIN}\n${extra}`,
    });
    expect(parseMock.mock.calls[0]?.[1]).toBe("main.bean");
  });

  it("projects a deletion by dropping the path", async () => {
    loadMock.mockResolvedValue({
      files: {
        "main.bean": `${MAIN}include "extra.bean"\n`,
        "extra.bean": "2020-01-01 open Assets:Other USD\n",
      },
      entryPoint: "main.bean",
      repoPaths: ["main.bean", "extra.bean"],
    });
    await service().checkProjectedErrors({
      ledgerId: "alice/main",
      userId: "user-1",
      overlays: [{ path: "extra.bean", content: null }],
    });
    expect(parseMock.mock.calls[0]?.[0]).toEqual({
      "main.bean": `${MAIN}include "extra.bean"\n`,
    });
  });

  it("returns the mapped errors", async () => {
    parseMock.mockResolvedValue({
      errors: [
        {
          message: "Transaction does not balance",
          file: "main.bean",
          line: 5,
        },
      ],
    });
    const errors = await service().checkProjectedErrors({
      ledgerId: "alice/main",
      userId: "user-1",
      overlays: [{ path: "main.bean", content: b64(MAIN) }],
    });
    expect(errors).toEqual([
      {
        message: "Transaction does not balance",
        source: { filename: "main.bean", lineno: 5 },
      },
    ]);
  });

  it("refuses unsafe paths and oversized projections", async () => {
    await expect(
      service().checkProjectedErrors({
        ledgerId: "alice/main",
        userId: "user-1",
        overlays: [{ path: "../escape.bean", content: b64("x") }],
      }),
    ).rejects.toThrow();
    expect(parseMock).not.toHaveBeenCalled();
    await expect(
      service().checkProjectedErrors({
        ledgerId: "alice/main",
        userId: "user-1",
        overlays: Array.from({ length: 51 }, (_, i) => ({
          path: `f${i}.bean`,
          content: b64("x"),
        })),
      }),
    ).rejects.toThrow(/at most 50/);
  });
});
