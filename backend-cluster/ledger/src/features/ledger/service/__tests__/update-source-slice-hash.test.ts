import { loadCachedFileMapForRepo } from "@/foundation/clients/load-cached-ledger-file-map";
import { commitLedgerFiles } from "@/features/ledger/operations/commit-ledger-files";
import { findEntrySliceAsync } from "@/foundation/rustledger/source-slice-worker";
import { buildEntryIdMap, sliceSha256 } from "@/foundation/rustledger";
import { LedgerJournalService } from "@/features/ledger/service/ledger-journal-service";
import type { DirectiveJson } from "@rustledger/wasm";

// The WASM engine cannot boot under jest; the tests below exercise the real
// service logic with real ID/location hashing against stubbed parse IO.
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

jest.mock("@/foundation/rustledger/source-slice-worker", () => {
  const findEntrySliceAsync = jest.fn();
  return {
    findEntrySliceAsync,
    // A batch resolves each entry as the single lookup does (w1/237).
    findEntrySlicesAsync: (
      files: unknown,
      entryPoint: unknown,
      hashes: string[],
    ) =>
      Promise.all(
        hashes.map((hash) => findEntrySliceAsync(files, entryPoint, hash)),
      ),
  };
});

import { parseLedgerFiles } from "@/foundation/rustledger";

const loadMock = loadCachedFileMapForRepo as jest.Mock;
const commitMock = commitLedgerFiles as jest.Mock;
const parseMock = parseLedgerFiles as jest.Mock;
const findMock = findEntrySliceAsync as jest.Mock;

const TXN_OLD = [
  "2026-03-04 *",
  "  Expenses:Food  4.00 USD",
  "  Assets:Cash",
].join("\n");
const TXN_NEW = TXN_OLD.replace("*", '* "Tea edit"');

const OPEN_FOOD = {
  type: "open",
  date: "2026-01-01",
  account: "Expenses:Food",
  currencies: ["USD"],
} as DirectiveJson;

const OPEN_CASH = {
  type: "open",
  date: "2026-01-01",
  account: "Assets:Cash",
  currencies: ["USD"],
} as DirectiveJson;

function txnDirective(narration?: string): DirectiveJson {
  return {
    type: "transaction",
    date: "2026-03-04",
    flag: "*",
    ...(narration === undefined ? {} : { narration }),
    tags: [],
    links: [],
    postings: [
      {
        account: "Expenses:Food",
        units: { number: "4.00", currency: "USD" },
      },
      { account: "Assets:Cash" },
    ],
  } as DirectiveJson;
}

const TXN_OLD_DIRECTIVE = txnDirective();
const TXN_NEW_DIRECTIVE = txnDirective("Tea edit");

const PRE_IDS = buildEntryIdMap([OPEN_FOOD, OPEN_CASH, TXN_OLD_DIRECTIVE]);
const POST_IDS = buildEntryIdMap([OPEN_FOOD, OPEN_CASH, TXN_NEW_DIRECTIVE]);
const OLD_ID = PRE_IDS.get(TXN_OLD_DIRECTIVE)!;
const NEW_ID = POST_IDS.get(TXN_NEW_DIRECTIVE)!;
expect(OLD_ID).toBeDefined();
expect(NEW_ID).toBeDefined();
expect(NEW_ID).not.toBe(OLD_ID);

const MAIN_PRE = [
  "2026-01-01 open Expenses:Food USD",
  "2026-01-01 open Assets:Cash USD",
  "",
  TXN_OLD,
  "",
].join("\n");

let files: Record<string, string>;
let committed: boolean;

function snapshot(
  directives: DirectiveJson[],
  locations: Map<string, { filename: string; lineno: number }>,
) {
  // Deliberately NOT pre-seeding locations: the stub returns the directives
  // plus the transport-safe source index exactly as the worker boundary
  // delivers them, so the location lookup only matches through the service's
  // own re-seed from `snapshot.sourceDetails`.
  return {
    directives,
    errors: [] as never[],
    sourceDetails: Object.fromEntries(locations),
  };
}

function service(directiveLimit?: { exempt?: boolean }) {
  const giteaClientFactory = { getPublicApiClient: jest.fn() };
  return new LedgerJournalService(
    giteaClientFactory as never,
    {} as never,
    directiveLimit,
  );
}

beforeEach(() => {
  committed = false;
  files = { "main.bean": MAIN_PRE };
  loadMock.mockReset();
  commitMock.mockReset();
  parseMock.mockReset();
  findMock.mockReset();
  loadMock.mockImplementation(async () => ({
    files,
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
      transforms: Map<string, (current: string | null) => string>,
    ) => {
      for (const [path, apply] of transforms) {
        files[path] = await apply(files[path] ?? null);
      }
      committed = true;
    },
  );
  findMock.mockImplementation(async (_f: unknown, _e: unknown, hash: string) =>
    hash === OLD_ID
      ? {
          file: "main.bean",
          slice: TXN_OLD,
          sha256: sliceSha256(TXN_OLD),
          startLine: 3,
          endLine: 6,
          localOccurrence: 0,
        }
      : null,
  );
  const pre = [OPEN_FOOD, OPEN_CASH, TXN_OLD_DIRECTIVE];
  const post = [OPEN_FOOD, OPEN_CASH, TXN_NEW_DIRECTIVE];
  parseMock.mockImplementation(async () =>
    committed
      ? snapshot(
          post,
          new Map([[NEW_ID, { filename: "main.bean", lineno: 4 }]]),
        )
      : snapshot(
          pre,
          new Map([[OLD_ID, { filename: "main.bean", lineno: 4 }]]),
        ),
  );
});

describe("updateSourceSlice newEntryHash", () => {
  it("returns the edited entry's new public ID, which resolves afterwards", async () => {
    const svc = service();
    const updated = await svc.updateSourceSlice({
      ledgerId: "alice/main",
      userId: "user-1",
      entryHash: OLD_ID,
      sha256sum: sliceSha256(TXN_OLD),
      newContent: TXN_NEW,
    });

    expect(updated.newEntryHash).toBe(NEW_ID);
    expect(files["main.bean"]).toContain('"Tea edit"');
    // w23/042: the file the edit rewrote, for MCP's `wrote`.
    expect(updated.files).toEqual(["main.bean"]);
  });

  it("requests source details on the post-commit parse", async () => {
    const svc = service();
    await svc.updateSourceSlice({
      ledgerId: "alice/main",
      userId: "user-1",
      entryHash: OLD_ID,
      sha256sum: sliceSha256(TXN_OLD),
      newContent: TXN_NEW,
    });

    // Without source details the engine never attaches source locations, so
    // the location lookup cannot match and every update falls through to the
    // stale input hash. The resolution parse is the last one the update makes.
    const lastCall = parseMock.mock.calls.at(-1);
    expect(lastCall?.[2]).toEqual(
      expect.objectContaining({ includeSourceDetails: true }),
    );
  });
});

// The commit boundary checks the directive limit (w0/m6); the request's
// exemption has to reach it, or an exempt caller's edit would be counted.
describe("updateSourceSlice directive-limit exemption", () => {
  const update = (svc: LedgerJournalService) =>
    svc.updateSourceSlice({
      ledgerId: "alice/main",
      userId: "user-1",
      entryHash: OLD_ID,
      sha256sum: sliceSha256(TXN_OLD),
      newContent: TXN_NEW,
    });

  it("passes the request's exemption to the commit", async () => {
    await update(service({ exempt: true }));

    expect(commitMock.mock.calls[0][5]).toEqual({
      directiveLimit: { exempt: true },
    });
  });

  it("commits unexempted by default", async () => {
    await update(service());

    expect(commitMock.mock.calls[0][5]).toEqual({ directiveLimit: {} });
  });
});

// w23/036: newContent was spliced in unchecked, so an `option` line or a
// second entry committed as an "update" of the entry it replaced.
describe("updateSourceSlice newContent", () => {
  it.each([
    ['option "title" "qa-option"', "configures the ledger"],
    ['include "other.bean"', "configures the ledger"],
    [`${TXN_NEW}\n${TXN_OLD}`, "holds 2 entries"],
    ["", "holds no entry"],
    ["; only a comment\n", "holds no entry"],
    ["pushtag #trip", "must be one dated directive"],
  ])("refuses %p without touching the file", async (newContent, problem) => {
    await expect(
      service().updateSourceSlice({
        ledgerId: "alice/main",
        userId: "user-1",
        entryHash: OLD_ID,
        sha256sum: sliceSha256(TXN_OLD),
        newContent,
      }),
    ).rejects.toMatchObject({
      category: "BAD_USER_INPUT",
      message: expect.stringContaining(problem),
    });
    expect(commitMock).not.toHaveBeenCalled();
    expect(files["main.bean"]).toBe(MAIN_PRE);
  });

  it("still commits one entry with a comment above it", async () => {
    await service().updateSourceSlice({
      ledgerId: "alice/main",
      userId: "user-1",
      entryHash: OLD_ID,
      sha256sum: sliceSha256(TXN_OLD),
      newContent: `; tea, not coffee\n${TXN_NEW}`,
    });
    expect(files["main.bean"]).toContain('"Tea edit"');
  });
});
