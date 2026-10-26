import { createHash } from "crypto";
import { loadCachedFileMapForRepo } from "@/foundation/clients/load-cached-ledger-file-map";
import { buildEntryIdMap, sliceSha256 } from "@/foundation/rustledger";
import { findEntrySliceAsync } from "@/foundation/rustledger/source-slice-worker";
import { LedgerJournalService } from "@/features/ledger/service/ledger-journal-service";
import { ConflictError } from "@/shared/errors";
import type { DirectiveJson } from "@rustledger/wasm";

// w23/m1/t002: overlapped same-entry updates. The fake Gitea below answers a
// stale blob SHA the way production does (w23/072) — a 500 no conflict
// matcher recognizes — so no retry fires and the loser's fate is decided by
// the transform's re-location, exactly as on main. `commitLedgerFiles` is
// deliberately NOT mocked: the race is in the read/commit interleaving.

// The WASM engine cannot boot under jest; the tests below exercise the real
// service + commit logic with real ID/location hashing against stubbed IO.
jest.mock("@/foundation/clients/load-cached-ledger-file-map", () => ({
  loadCachedFileMapForRepo: jest.fn(),
}));

jest.mock("@/foundation/rustledger", () => {
  const actual = jest.requireActual("@/foundation/rustledger");
  return { ...actual, parseLedgerFiles: jest.fn() };
});

jest.mock("@/foundation/rustledger/source-slice-worker", () => ({
  findEntrySliceAsync: jest.fn(),
}));

import { parseLedgerFiles } from "@/foundation/rustledger";

const loadMock = loadCachedFileMapForRepo as jest.Mock;
const parseMock = parseLedgerFiles as jest.Mock;
const findMock = findEntrySliceAsync as jest.Mock;

const txn = (narration: string) =>
  [`2026-03-04 * "${narration}"`, "  Expenses:Food  4.00 USD", "  Assets:Cash"].join(
    "\n",
  );
const OPENS = ["2026-01-01 open Expenses:Food USD", "2026-01-01 open Assets:Cash USD"].join(
  "\n",
);
const MAIN_ONE = [OPENS, "", txn("Lunch"), ""].join("\n");
const MAIN_TWO = [OPENS, "", txn("Lunch"), "", txn("Lunch"), ""].join("\n");

const txnDirective = (narration: string) =>
  ({
    type: "transaction",
    date: "2026-03-04",
    flag: "*",
    narration,
    tags: [],
    links: [],
    postings: [
      { account: "Expenses:Food", units: { number: "4.00", currency: "USD" } },
      { account: "Assets:Cash" },
    ],
  }) as DirectiveJson;

const IDS = buildEntryIdMap([
  { type: "open", date: "2026-01-01", account: "Expenses:Food", currencies: ["USD"] } as DirectiveJson,
  { type: "open", date: "2026-01-01", account: "Assets:Cash", currencies: ["USD"] } as DirectiveJson,
  txnDirective("Lunch"),
]);
const ENTRY_ID = [...IDS.entries()].find(([d]) => d.type === "transaction")![1]!;

/** Production's unrecognized lost-race 500 (w23/072): matched by NO retry rule. */
const prodRace500 = () =>
  Object.assign(new Error("HTTP 500"), {
    status: 500,
    error: { message: "internal error" },
  });

function riggedService(remote: { text: string }) {
  const shaOf = (text: string) => createHash("sha256").update(text).digest("hex");
  const client = {
    repos: {
      repoGetContents: jest.fn(async () => ({
        data: {
          content: Buffer.from(remote.text).toString("base64"),
          encoding: "base64",
          sha: shaOf(remote.text),
        },
      })),
      repoChangeFiles: jest.fn(
        async (_o: string, _r: string, body: { files: Array<{ content: string; sha?: string }> }) => {
          const op = body.files[0]!;
          if (op.sha !== shaOf(remote.text)) throw prodRace500();
          remote.text = Buffer.from(op.content, "base64").toString("utf8");
        },
      ),
    },
  };
  const svc = new LedgerJournalService(
    { getPublicApiClient: jest.fn(async () => client) } as never,
    {} as never,
    { exempt: true },
  );
  return svc;
}

beforeEach(() => {
  loadMock.mockReset();
  parseMock.mockReset();
  findMock.mockReset();
  parseMock.mockImplementation(async () => ({ directives: [], errors: [] }));
});

describe("overlapped updates on one unique entry", () => {
  it.each([1, 2, 3, 4, 5])(
    "round %i leaves one entry with the winner's content and fails the loser",
    async () => {
      const remote = { text: MAIN_ONE };
      const svc = riggedService(remote);
      loadMock.mockImplementation(async () => ({
        files: { "main.bean": remote.text },
        entryPoint: "main.bean",
        repoPaths: ["main.bean"],
        managedPrices: [],
        managedPricePaths: [],
      }));
      findMock.mockImplementation(async () => ({
        file: "main.bean",
        slice: txn("Lunch"),
        sha256: sliceSha256(txn("Lunch")),
        startLine: 3,
        endLine: 6,
        localOccurrence: 0,
      }));
      const sha = sliceSha256(txn("Lunch"));
      const attempt = (narration: string) =>
        svc
          .updateSourceSlice({
            ledgerId: "alice/main",
            userId: "user-1",
            entryHash: ENTRY_ID,
            sha256sum: sha,
            newContent: txn(narration),
          })
          .then(
            () => "ok" as const,
            (error: unknown) => error as Error,
          );
      const [a, b] = await Promise.all([attempt("AAA"), attempt("BBB")]);
      const oks = [a, b].filter((r) => r === "ok");
      expect(oks).toHaveLength(1);
      const blocks = remote.text.split("\n\n").filter((t) => t.includes("2026-03-04"));
      expect(blocks).toHaveLength(1);
      expect(blocks[0]).toContain(a === "ok" ? "AAA" : "BBB");
    },
  );
});

describe("overlapped updates on identical twins", () => {
  it("refuses the loser rather than editing the twin it did not address", async () => {
    const remote = { text: MAIN_TWO };
    const svc = riggedService(remote);
    // The loser located against the pre-race snapshot (a stale file-map
    // read racing the winner's commit); the commit re-reads live.
    let frozen: Record<string, string> | null = { "main.bean": MAIN_TWO };
    loadMock.mockImplementation(async () => ({
      files: frozen ?? { "main.bean": remote.text },
      entryPoint: "main.bean",
      repoPaths: ["main.bean"],
      managedPrices: [],
      managedPricePaths: [],
    }));
    findMock.mockImplementation(async () => ({
      file: "main.bean",
      slice: txn("Lunch"),
      sha256: sliceSha256(txn("Lunch")),
      startLine: 3,
      endLine: 6,
      localOccurrence: 0,
    }));
    const sha = sliceSha256(txn("Lunch"));
    const update = (narration: string) =>
      svc.updateSourceSlice({
        ledgerId: "alice/main",
        userId: "user-1",
        entryHash: ENTRY_ID,
        sha256sum: sha,
        newContent: txn(narration),
      });

    await update("AAA");
    // The loser located pre-race (frozen map); its commit re-reads live.
    await expect(update("BBB")).rejects.toBeInstanceOf(ConflictError);
    // The winner's block stands; the untouched twin keeps its text; the
    // loser's narration appears nowhere.
    expect(remote.text).toContain(txn("AAA"));
    expect(remote.text).toContain(txn("Lunch"));
    expect(remote.text).not.toContain("BBB");

    // The documented retry loop: re-read the addressed entry's fresh sha
    // and resend — the retry commits (w23/m1/t004).
    frozen = null;
    findMock.mockImplementation(async () => ({
      file: "main.bean",
      slice: txn("AAA"),
      sha256: sliceSha256(txn("AAA")),
      startLine: 3,
      endLine: 6,
      localOccurrence: 0,
    }));
    await svc.updateSourceSlice({
      ledgerId: "alice/main",
      userId: "user-1",
      entryHash: ENTRY_ID,
      sha256sum: sliceSha256(txn("AAA")),
      newContent: txn("BBB-retry"),
    });
    expect(remote.text).toContain(txn("BBB-retry"));
    expect(remote.text).toContain(txn("Lunch"));
  });

  it("still edits one twin when nothing raced", async () => {
    const remote = { text: MAIN_TWO };
    const svc = riggedService(remote);
    loadMock.mockImplementation(async () => ({
      files: { "main.bean": remote.text },
      entryPoint: "main.bean",
      repoPaths: ["main.bean"],
      managedPrices: [],
      managedPricePaths: [],
    }));
    findMock.mockImplementation(async () => ({
      file: "main.bean",
      slice: txn("Lunch"),
      sha256: sliceSha256(txn("Lunch")),
      startLine: 8,
      endLine: 11,
      localOccurrence: 1,
    }));
    await svc.updateSourceSlice({
      ledgerId: "alice/main",
      userId: "user-1",
      entryHash: ENTRY_ID,
      sha256sum: sliceSha256(txn("Lunch")),
      newContent: txn("Solo"),
    });
    expect(remote.text).toContain(txn("Solo"));
    expect(remote.text).toContain(txn("Lunch"));
  });

  it("refuses a delete whose twin set changed since it was located", async () => {
    const remote = { text: MAIN_TWO };
    const svc = riggedService(remote);
    const frozen = { "main.bean": MAIN_TWO };
    let calls = 0;
    loadMock.mockImplementation(async () => {
      calls += 1;
      return {
        // The raced edit (first load) sees live; the deleter (second load)
        // located before the edit committed — a stale twin-set read.
        files: calls === 2 ? frozen : { "main.bean": remote.text },
        entryPoint: "main.bean",
        repoPaths: ["main.bean"],
        managedPrices: [],
        managedPricePaths: [],
      };
    });
    findMock.mockImplementation(async () => ({
      file: "main.bean",
      slice: txn("Lunch"),
      sha256: sliceSha256(txn("Lunch")),
      startLine: 3,
      endLine: 6,
      localOccurrence: 0,
    }));
    const sha = sliceSha256(txn("Lunch"));
    // An unrelated raced edit rotates one twin before the delete commits.
    await svc.updateSourceSlice({
      ledgerId: "alice/main",
      userId: "user-1",
      entryHash: ENTRY_ID,
      sha256sum: sha,
      newContent: txn("Raced"),
    });
    await expect(
      svc.deleteSourceSlice({
        ledgerId: "alice/main",
        userId: "user-1",
        entryHash: ENTRY_ID,
        sha256sum: sha,
      }),
    ).rejects.toBeInstanceOf(ConflictError);
    expect(remote.text).toContain(txn("Raced"));
    expect(remote.text).toContain(txn("Lunch"));
  });
});
