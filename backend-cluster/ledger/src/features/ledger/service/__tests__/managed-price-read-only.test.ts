import { OperationNotAllowedError } from "@/shared/errors";
import { loadCachedFileMapForRepo } from "@/foundation/clients/load-cached-ledger-file-map";
import { commitLedgerFiles } from "@/features/ledger/operations/commit-ledger-files";
import { findEntrySliceAsync } from "@/foundation/rustledger/source-slice-worker";
import { sliceSha256 } from "@/foundation/rustledger";
import { LedgerJournalService } from "@/features/ledger/service/ledger-journal-service";

/**
 * A managed price feed is a virtual, read-only file (ADR 015 section 9).
 * Every source-slice write path must refuse an entry located inside one
 * BEFORE any commit: the path is not a repository file, and writing it would
 * create a file named after a URL.
 */
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
  return {
    ...actual,
    parseLedgerFiles: jest.fn(async () => ({ directives: [], errors: [] })),
  };
});

jest.mock("@/foundation/rustledger/source-slice-worker", () => ({
  findEntrySliceAsync: jest.fn(),
}));

const loadMock = loadCachedFileMapForRepo as jest.Mock;
const commitMock = commitLedgerFiles as jest.Mock;
const findMock = findEntrySliceAsync as jest.Mock;

const VIRTUAL = "https:/beancount.io/prices/BTC-USD";
const PRICE = "2026-09-15 price BTC 76000.00 USD";
const HASH = "managed-price-entry";

function service() {
  const giteaClientFactory = { getPublicApiClient: jest.fn() };
  return new LedgerJournalService(giteaClientFactory as never, {} as never);
}

beforeEach(() => {
  loadMock.mockReset();
  commitMock.mockReset();
  findMock.mockReset();
  loadMock.mockResolvedValue({
    files: {
      "main.bean": 'include "https://beancount.io/prices/BTC-USD"\n',
      [VIRTUAL]: `${PRICE}\n`,
    },
    entryPoint: "main.bean",
    repoPaths: ["main.bean"],
    managedPrices: [],
    managedPricePaths: [VIRTUAL],
  });
  findMock.mockResolvedValue({
    file: VIRTUAL,
    slice: PRICE,
    sha256: sliceSha256(PRICE),
    startLine: 0,
    endLine: 1,
    localOccurrence: 0,
  });
});

const READ_ONLY = new RegExp(
  `Operation 'edit managed price source' not allowed: ${VIRTUAL} is a managed price feed resolved from a URL include and is read-only`,
  "u",
);

describe("source-slice writes against a managed price feed", () => {
  it("refuses an update before committing", async () => {
    const attempt = service().updateSourceSlice({
      ledgerId: "alice/main",
      userId: "user-1",
      entryHash: HASH,
      sha256sum: sliceSha256(PRICE),
      newContent: "2026-09-15 price BTC 1.00 USD",
    });
    await expect(attempt).rejects.toBeInstanceOf(OperationNotAllowedError);
    await expect(
      service().updateSourceSlice({
        ledgerId: "alice/main",
        userId: "user-1",
        entryHash: HASH,
        sha256sum: sliceSha256(PRICE),
        newContent: "2026-09-15 price BTC 1.00 USD",
      }),
    ).rejects.toThrow(READ_ONLY);
    expect(commitMock).not.toHaveBeenCalled();
  });

  it("refuses a delete before committing", async () => {
    await expect(
      service().deleteSourceSlice({
        ledgerId: "alice/main",
        userId: "user-1",
        entryHash: HASH,
        sha256sum: sliceSha256(PRICE),
      }),
    ).rejects.toThrow(READ_ONLY);
    expect(commitMock).not.toHaveBeenCalled();
  });

  it("refuses a batch delete that touches one, all-or-nothing", async () => {
    await expect(
      service().deleteMultiSourceSlices({
        ledgerId: "alice/main",
        userId: "user-1",
        entries: [{ entryHash: HASH, sha256sum: sliceSha256(PRICE) }],
      }),
    ).rejects.toThrow(READ_ONLY);
    expect(commitMock).not.toHaveBeenCalled();
  });
});

describe("entry context for a managed price entry", () => {
  const source = (file: string) => ({
    url: "https://beancount.io/prices/BTC-USD",
    includedFrom: [
      { file, line: 1, target: "https://beancount.io/prices/BTC-USD" },
    ],
  });

  it("names the feed, so clients need not parse the virtual path", async () => {
    loadMock.mockResolvedValue({
      ...(await loadMock()),
      managedPrices: [source("main.bean")],
    });
    const context = await service().getContext({
      ledgerId: "alice/main",
      userId: undefined,
      entryHash: HASH,
    });
    expect(context.managed_source).toBe("https://beancount.io/prices/BTC-USD");
  });

  it("matches a feed included from a nested file by its resolved key", async () => {
    const nested = "books/https:/beancount.io/prices/BTC-USD";
    loadMock.mockResolvedValue({
      ...(await loadMock()),
      managedPrices: [source("books/2026.bean")],
    });
    findMock.mockResolvedValue({ ...(await findMock()), file: nested });
    const context = await service().getContext({
      ledgerId: "alice/main",
      userId: undefined,
      entryHash: HASH,
    });
    expect(context.managed_source).toBe("https://beancount.io/prices/BTC-USD");
  });

  it("is null for an entry in a repository file", async () => {
    loadMock.mockResolvedValue({
      ...(await loadMock()),
      managedPrices: [source("main.bean")],
    });
    findMock.mockResolvedValue({ ...(await findMock()), file: "main.bean" });
    const context = await service().getContext({
      ledgerId: "alice/main",
      userId: undefined,
      entryHash: HASH,
    });
    expect(context.managed_source).toBeNull();
  });
});
