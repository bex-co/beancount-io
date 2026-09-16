import {
  checkDirectiveLimitForFileChanges,
  countDirectivesForRepo,
} from "@/core/directive-limit";
import { loadCachedFileMapForRepo } from "@/foundation/clients/load-cached-ledger-file-map";
import { getMaxDirectives } from "@/core/backend-v2-limits";

// The engine cannot boot under jest; count the top-level dated lines of the
// map the limit check hands it, so a virtual feed left in the map shows up.
jest.mock("@/foundation/rustledger", () => ({
  ...jest.requireActual("@/foundation/rustledger"),
  withLedger: async (
    files: Record<string, string>,
    _entry: string,
    fn: (l: { directiveCount: () => number }) => number,
  ) =>
    fn({
      directiveCount: () =>
        Object.values(files)
          .join("\n")
          .split("\n")
          .filter((line) => /^\d{4}-\d{2}-\d{2} /u.test(line)).length,
    }),
}));

jest.mock("@/foundation/clients/load-cached-ledger-file-map", () => ({
  loadCachedFileMapForRepo: jest.fn(),
  resolveHeadShaCoalesced: jest.fn(async () => "deadbeef"),
}));

jest.mock("@/core/backend-v2-limits", () => ({ getMaxDirectives: jest.fn() }));

const loadMock = loadCachedFileMapForRepo as jest.Mock;
const limitMock = getMaxDirectives as jest.Mock;

const VIRTUAL = "https:/beancount.io/prices/BTC-USD";
const FEED = Array.from(
  { length: 87 },
  (_v, i) => `2026-06-${String((i % 28) + 1).padStart(2, "0")} price BTC 1 USD`,
).join("\n");

const MAIN = `2020-01-01 open Assets:BTC BTC\ninclude "https://beancount.io/prices/BTC-USD"\n2020-01-02 open Assets:Cash USD\n`;

beforeEach(() => {
  loadMock.mockReset();
  limitMock.mockReset();
  // The real loader overlays the feed unless asked for committed files only;
  // the stub does the same so a caller that forgets the option is caught.
  loadMock.mockImplementation(
    async (
      _client: unknown,
      _cache: unknown,
      _owner: string,
      _repo: string,
      options?: { committedOnly?: boolean },
    ) => ({
      files: options?.committedOnly
        ? { "main.bean": MAIN }
        : { "main.bean": MAIN, [VIRTUAL]: FEED },
      entryPoint: "main.bean",
      repoPaths: ["main.bean"],
      managedPrices: [],
      managedPricePaths: options?.committedOnly ? [] : [VIRTUAL],
    }),
  );
});

describe("directive limit with managed price feeds", () => {
  it("counts only the customer's directives, without resolving feeds", async () => {
    await expect(
      countDirectivesForRepo({} as never, "alice", "main"),
    ).resolves.toEqual({ count: 2, sha: "deadbeef" });
    expect(loadMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      "alice",
      "main",
      { committedOnly: true },
    );
  });

  it("does not let a feed push a write over the tier limit", async () => {
    limitMock.mockResolvedValue(3);
    const change = {
      "main.bean": Buffer.from(
        "2020-01-01 open Assets:BTC BTC\n2020-01-02 open Assets:Cash USD\n2020-01-03 open Assets:Bank USD\n",
      ).toString("base64"),
    };
    // 3 customer directives are within a limit of 3 even with 87 feed prices.
    await expect(
      checkDirectiveLimitForFileChanges({} as never, "alice", "main", change),
    ).resolves.toBeUndefined();
    limitMock.mockResolvedValue(2);
    await expect(
      checkDirectiveLimitForFileChanges({} as never, "alice", "main", change),
    ).rejects.toThrow(/free-tier limit of 2 directives .*approximately 3/u);
  });
});
