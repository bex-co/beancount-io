import { createHash } from "node:crypto";
import { loadCachedFileMapForRepo } from "@/foundation/clients/load-cached-ledger-file-map";
import { findEntrySliceAsync } from "@/foundation/rustledger/source-slice-worker";
import { sliceSha256, UNDECODABLE_SOURCE } from "@/foundation/rustledger";
import { LedgerJournalService } from "@/features/ledger/service/ledger-journal-service";
import {
  BadUserInputError,
  ConflictError,
  NewLedgerErrorsError,
} from "@/shared/errors";

/**
 * w31/131 — a source-slice write that a concurrent write overtakes.
 *
 * Each of the four writes checks its projection on the files it loaded, then
 * commits. The commit used to read each file again and re-apply the edit to
 * whatever it held by then, so an edit that was valid on the ledger it read,
 * but broke the ledger it landed on, committed without `allowInvalid`, and
 * the write reported the stale check (`errorsAfter: 0`).
 *
 * The real `commitLedgerFiles` runs over a fake Gitea that versions files by
 * content and refuses a stale blob sha. A rival write lands right after a
 * write loads the ledger, or right before its commit, as a concurrent
 * caller's would. The WASM engine cannot boot under jest, so a stub checks
 * the one rule these ledgers exercise: each `balance Assets:Cash` against the
 * Cash postings dated before it, in the files `main.bean` reaches.
 */
jest.mock("@/foundation/clients/load-cached-ledger-file-map", () => ({
  loadCachedFileMapForRepo: jest.fn(),
}));
jest.mock("@/foundation/rustledger", () => {
  const actual = jest.requireActual("@/foundation/rustledger");
  return { ...actual, parseLedgerFiles: jest.fn() };
});
jest.mock("@/foundation/rustledger/source-slice-worker", () => {
  const findEntrySliceAsync = jest.fn();
  return {
    findEntrySliceAsync,
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
const parseMock = parseLedgerFiles as jest.Mock;
const findMock = findEntrySliceAsync as jest.Mock;

type Files = Record<string, string>;

const probe = (amount: string) =>
  [
    '2026-08-30 * "race probe"',
    `  Assets:Cash  -${amount} USD`,
    `  Expenses:Coffee  ${amount} USD`,
  ].join("\n");
const PROBE = probe("1.00");
const PROBE_EDITED = probe("2.00");
const LATER = [
  '2026-09-02 * "later coffee"',
  "  Assets:Cash  -3.00 USD",
  "  Expenses:Coffee  3.00 USD",
].join("\n");
/** Holds only while the probe takes exactly 1.00 USD out of 50.75. */
const RIVAL = "2026-08-31 balance Assets:Cash  49.75 USD";
/** Fails once a file holding it is included: the probe has left 49.75. */
const RIVAL_ARCHIVE = "2026-08-31 balance Assets:Cash  50.75 USD";
const NOTE = '2026-09-05 note Assets:Cash "unrelated"';
const BALANCE_ERROR = (expected: string, got: string) =>
  `Balance failed for Assets:Cash: expected ${expected} USD, got ${got} USD`;

const MAIN = [
  "2026-01-01 open Assets:Cash USD",
  "2026-01-01 open Expenses:Coffee USD",
  "",
  '2026-08-01 * "seed"',
  "  Assets:Cash  50.75 USD",
  "  Equity:Opening  -50.75 USD",
  "",
  "2026-08-29 balance Assets:Cash  50.75 USD",
  "",
  PROBE,
  "",
  LATER,
  "",
].join("\n");

/** Entry hashes this fixture's finder answers, by the block they name. */
const BLOCKS: Record<string, string> = { probe: PROBE, later: LATER };

function reachedFiles(files: Files): string[] {
  const reached: string[] = [];
  const queue = ["main.bean"];
  while (queue.length > 0) {
    const file = queue.shift()!;
    if (reached.includes(file) || files[file] === undefined) continue;
    reached.push(file);
    for (const [, target] of files[file].matchAll(/^include "([^"]+)"$/gm))
      queue.push(target!);
  }
  return reached;
}

const cents = (amount: string) => Math.round(Number(amount) * 100);
const usd = (value: number) => (value / 100).toFixed(2);

/** The stub engine: every Cash balance assertion against the postings before it. */
function cashErrors(files: Files) {
  const postings: { date: string; value: number }[] = [];
  const balances: {
    date: string;
    value: number;
    file: string;
    line: number;
  }[] = [];
  for (const file of reachedFiles(files)) {
    let date = "";
    files[file].split("\n").forEach((text, index) => {
      const head = /^(\d{4}-\d{2}-\d{2}) \*/.exec(text);
      if (head) date = head[1]!;
      const posting = /^\s+Assets:Cash\s+(-?\d+\.\d{2}) USD$/.exec(text);
      if (posting) postings.push({ date, value: cents(posting[1]!) });
      const balance =
        /^(\d{4}-\d{2}-\d{2}) balance Assets:Cash\s+(-?\d+\.\d{2}) USD$/.exec(
          text,
        );
      if (balance)
        balances.push({
          date: balance[1]!,
          value: cents(balance[2]!),
          file,
          line: index + 1,
        });
    });
  }
  return balances.flatMap(({ date, value, file, line }) => {
    const got = postings
      .filter((posting) => posting.date < date)
      .reduce((sum, posting) => sum + posting.value, 0);
    return got === value
      ? []
      : [{ message: BALANCE_ERROR(usd(value), usd(got)), file, line }];
  });
}

/** Where `block` starts in `content`, by 0-based line, each occurrence. */
function blockStarts(content: string, block: string): number[] {
  const lines = content.split("\n");
  const wanted = block.split("\n");
  const starts: number[] = [];
  for (let at = 0; at + wanted.length <= lines.length; at += 1)
    if (wanted.every((line, offset) => lines[at + offset] === line))
      starts.push(at);
  return starts;
}

const blob = (text: string) => createHash("sha1").update(text).digest("hex");

function fixture(initial: Files) {
  const remote = new Map(Object.entries(initial));
  const state = {
    loads: 0,
    /** Messages of the commits that landed. */
    commits: [] as string[],
    /** Concurrent writes, one landing right after each load. */
    afterLoad: [] as Array<(files: Map<string, string>) => void>,
    /** Concurrent writes, one landing right before each commit. */
    beforeCommit: [] as Array<(files: Map<string, string>) => void>,
  };
  const client = {
    repos: {
      repoGetContents: jest.fn(async (_o: string, _r: string, path: string) => {
        const text = remote.get(decodeURIComponent(path));
        if (text === undefined)
          throw Object.assign(new Error("HTTP 404"), { status: 404 });
        return {
          data: {
            content: Buffer.from(text).toString("base64"),
            encoding: "base64",
            sha: blob(text),
          },
        };
      }),
      repoChangeFiles: jest.fn(
        async (
          _o: string,
          _r: string,
          body: {
            message: string;
            files: {
              operation: string;
              path: string;
              content: string;
              sha?: string;
            }[];
          },
        ) => {
          state.beforeCommit.shift()?.(remote);
          for (const file of body.files) {
            const current = remote.get(file.path);
            const stale =
              file.operation === "create"
                ? current !== undefined
                : current === undefined || blob(current) !== file.sha;
            if (stale)
              throw Object.assign(new Error("HTTP 409"), {
                status: 409,
                error: { message: "sha does not match" },
              });
          }
          for (const file of body.files)
            remote.set(
              file.path,
              Buffer.from(file.content, "base64").toString("utf8"),
            );
          state.commits.push(body.message);
          return { data: { commit: { sha: `c${state.commits.length}` } } };
        },
      ),
    },
  };
  loadMock.mockImplementation(async () => {
    state.loads += 1;
    const files = Object.fromEntries(remote);
    state.afterLoad.shift()?.(remote);
    return {
      files,
      entryPoint: "main.bean",
      repoPaths: Object.keys(files),
      sourceFiles: reachedFiles(files),
      managedPrices: [],
      managedPricePaths: [],
    };
  });
  findMock.mockImplementation(
    async (files: Files, _entryPoint: string, hash: string) => {
      const [name, occurrence = "0"] = hash.split(":");
      const block = BLOCKS[name!];
      if (block === undefined) return null;
      const found = reachedFiles(files).flatMap((file) =>
        blockStarts(files[file], block).map((startLine, localOccurrence) => ({
          file,
          startLine,
          localOccurrence,
        })),
      )[Number(occurrence)];
      return found
        ? {
            ...found,
            slice: block,
            sha256: sliceSha256(block),
            endLine: found.startLine + block.split("\n").length,
          }
        : null;
    },
  );
  const service = new LedgerJournalService(
    { getPublicApiClient: jest.fn(async () => client) } as never,
    {} as never,
    { exempt: true },
  );
  return {
    state,
    service,
    file: (path: string) => remote.get(path),
  };
}

const appendTo = (path: string, text: string) => (files: Map<string, string>) =>
  files.set(path, `${files.get(path) ?? ""}${text}\n`);
const LEDGER = { ledgerId: "alice/main", userId: "user-1" };
const PROBE_REF = { entryHash: "probe", sha256sum: sliceSha256(PROBE) };
const LATER_REF = { entryHash: "later", sha256sum: sliceSha256(LATER) };

beforeEach(() => {
  [loadMock, parseMock, findMock].forEach((mock) => mock.mockReset());
  parseMock.mockImplementation(async (files: Files) => ({
    directives: [],
    errors: cashErrors(files),
    sourceDetails: {},
  }));
});

/** The four writes, each set up to break once the rival lands. */
const WRITES = {
  update: {
    initial: { "main.bean": MAIN },
    rival: appendTo("main.bean", RIVAL),
    run: (service: LedgerJournalService, allowInvalid?: boolean) =>
      service.updateSourceSlice({
        ...LEDGER,
        ...PROBE_REF,
        newContent: PROBE_EDITED,
        allowInvalid,
      }),
    landed: (file: (path: string) => string | undefined) =>
      file("main.bean")!.includes(PROBE_EDITED),
    error: { message: BALANCE_ERROR("49.75", "48.75"), file: "main.bean" },
  },
  delete: {
    initial: { "main.bean": MAIN },
    rival: appendTo("main.bean", RIVAL),
    run: (service: LedgerJournalService, allowInvalid?: boolean) =>
      service.deleteSourceSlice({ ...LEDGER, ...PROBE_REF, allowInvalid }),
    landed: (file: (path: string) => string | undefined) =>
      !file("main.bean")!.includes(PROBE),
    error: { message: BALANCE_ERROR("49.75", "50.75"), file: "main.bean" },
  },
  "delete-many": {
    initial: { "main.bean": MAIN },
    rival: appendTo("main.bean", RIVAL),
    run: (service: LedgerJournalService, allowInvalid?: boolean) =>
      service.deleteMultiSourceSlices({
        ...LEDGER,
        entries: [PROBE_REF, LATER_REF],
        allowInvalid,
      }),
    landed: (file: (path: string) => string | undefined) =>
      !file("main.bean")!.includes(PROBE) &&
      !file("main.bean")!.includes(LATER),
    error: { message: BALANCE_ERROR("49.75", "50.75"), file: "main.bean" },
  },
  // archive.bean does not exist when the move loads; a concurrent write
  // creates it with an assertion that fails once the move includes it.
  move: {
    initial: { "main.bean": MAIN },
    rival: appendTo("archive.bean", RIVAL_ARCHIVE),
    run: (service: LedgerJournalService, allowInvalid?: boolean) =>
      service.moveSourceSlices({
        ...LEDGER,
        entries: [PROBE_REF],
        toPath: "archive.bean",
        includeFrom: "main.bean",
        allowInvalid,
      }),
    landed: (file: (path: string) => string | undefined) =>
      !file("main.bean")!.includes(PROBE) &&
      (file("archive.bean") ?? "").includes(PROBE),
    error: { message: BALANCE_ERROR("50.75", "49.75"), file: "archive.bean" },
  },
} as const;
const NAMES = Object.keys(WRITES) as (keyof typeof WRITES)[];

describe("a source-slice write that a concurrent write overtakes", () => {
  it.each(NAMES)(
    "%s alone is valid: it commits and reports no new error",
    async (name) => {
      const write = WRITES[name];
      const f = fixture(write.initial);
      const result = await write.run(f.service);
      expect(result.validation).toEqual({
        errorsBefore: 0,
        errorsAfter: 0,
        newErrors: [],
      });
      expect(write.landed(f.file)).toBe(true);
      expect(f.state.commits).toHaveLength(1);
    },
  );

  it.each(NAMES)(
    "%s is checked again on what landed and refused, committing nothing",
    async (name) => {
      const write = WRITES[name];
      const f = fixture(write.initial);
      f.state.afterLoad = [write.rival];
      const before = {
        main: f.file("main.bean"),
        archive: f.file("archive.bean"),
      };

      const outcome = write.run(f.service);
      await expect(outcome).rejects.toBeInstanceOf(NewLedgerErrorsError);
      await expect(outcome).rejects.toThrow(write.error.message);

      // The rival's write stands, untouched; this one wrote nothing.
      expect(f.state.commits).toEqual([]);
      expect(f.file("main.bean")).toBe(
        name === "move" ? before.main : `${before.main}${RIVAL}\n`,
      );
      expect(f.file("archive.bean")).toBe(
        name === "move" ? `${RIVAL_ARCHIVE}\n` : before.archive,
      );
      expect(write.landed(f.file)).toBe(false);
      expect(f.state.loads).toBe(2);
    },
  );

  it.each(NAMES)(
    "%s with allowInvalid commits on what landed and reports that ledger's errors",
    async (name) => {
      const write = WRITES[name];
      const f = fixture(write.initial);
      f.state.afterLoad = [write.rival];

      const result = await write.run(f.service, true);

      expect(result.validation).toEqual({
        errorsBefore: 0,
        errorsAfter: 1,
        newErrors: [
          expect.objectContaining({
            message: write.error.message,
            severity: "error",
            source: expect.objectContaining({ filename: write.error.file }),
          }),
        ],
      });
      expect(result.commit).toBe("c1");
      expect(write.landed(f.file)).toBe(true);
      expect(
        cashErrors(
          Object.fromEntries(
            ["main.bean", "archive.bean"].flatMap((path) => {
              const text = f.file(path);
              return text === undefined ? [] : [[path, text]];
            }),
          ),
        ),
      ).toEqual([expect.objectContaining({ message: write.error.message })]);
    },
  );

  it.each(NAMES)(
    "%s lands on top of a rival write that breaks nothing",
    async (name) => {
      const write = WRITES[name];
      const f = fixture(write.initial);
      f.state.afterLoad = [appendTo("main.bean", NOTE)];

      const result = await write.run(f.service);

      expect(result.validation.errorsAfter).toBe(0);
      expect(write.landed(f.file)).toBe(true);
      expect(f.file("main.bean")).toContain(NOTE);
      expect(f.state.commits).toHaveLength(1);
      expect(f.state.loads).toBe(2);
    },
  );

  it("is checked again when the rival lands between its read and its commit", async () => {
    const write = WRITES.update;
    const f = fixture(write.initial);
    // The commit's own read still sees the checked content; Gitea then
    // refuses its stale sha, and the next read sees the rival.
    f.state.beforeCommit = [write.rival];

    await expect(write.run(f.service)).rejects.toBeInstanceOf(
      NewLedgerErrorsError,
    );
    expect(f.state.commits).toEqual([]);
    expect(f.file("main.bean")).toBe(`${MAIN}${RIVAL}\n`);
  });

  it("is CONFLICT after 3 lost races, writing nothing", async () => {
    const write = WRITES.update;
    const f = fixture(write.initial);
    f.state.afterLoad = [1, 2, 3, 4].map((n) =>
      appendTo("main.bean", `2026-09-0${n} note Assets:Cash "rival ${n}"`),
    );

    const outcome = write.run(f.service);
    await expect(outcome).rejects.toBeInstanceOf(ConflictError);
    await expect(outcome).rejects.toThrow(
      "Ledger conflict: concurrent writes changed the files this write touches before each of 3 attempts could commit; nothing was written",
    );
    expect(f.state.loads).toBe(3);
    expect(f.state.commits).toEqual([]);
    expect(f.file("main.bean")).not.toContain(PROBE_EDITED);
  });

  it("runs a dry run once: it commits nothing, so it has no race to lose", async () => {
    const write = WRITES.update;
    const f = fixture(write.initial);
    f.state.afterLoad = [write.rival];

    const result = await f.service.updateSourceSlice({
      ...LEDGER,
      ...PROBE_REF,
      newContent: PROBE_EDITED,
      dryRun: true,
    });

    expect(result.validation.errorsAfter).toBe(0);
    expect(f.state.loads).toBe(1);
    expect(f.state.commits).toEqual([]);
  });
});

describe("a re-run keeps the w23/m1 same-entry rules", () => {
  it("refuses when a rival rewrote the entry itself, rather than not finding it", async () => {
    const f = fixture({ "main.bean": MAIN });
    f.state.afterLoad = [
      (files) =>
        files.set(
          "main.bean",
          files.get("main.bean")!.replace(PROBE, probe("5.00")),
        ),
    ];

    const outcome = WRITES.update.run(f.service);
    await expect(outcome).rejects.toBeInstanceOf(ConflictError);
    await expect(outcome).rejects.toThrow("it has changed since it was loaded");
    expect(f.state.commits).toEqual([]);
    expect(f.file("main.bean")).toContain(probe("5.00"));
  });

  it("refuses when a rival added an identical twin the hash would now name", async () => {
    const f = fixture({ "main.bean": MAIN });
    // An identical twin beside the probe: the probe's hash could name either.
    f.state.afterLoad = [
      (files) =>
        files.set(
          "main.bean",
          files.get("main.bean")!.replace(PROBE, `${PROBE}\n\n${PROBE}`),
        ),
    ];

    const outcome = f.service.deleteSourceSlice({ ...LEDGER, ...PROBE_REF });
    await expect(outcome).rejects.toBeInstanceOf(ConflictError);
    await expect(outcome).rejects.toThrow("it has changed since it was loaded");
    expect(f.state.commits).toEqual([]);
    expect(blockStarts(f.file("main.bean")!, PROBE)).toHaveLength(2);
  });

  it("refuses a batch whose second entry a rival moved to another file", async () => {
    const f = fixture({
      "main.bean": `${MAIN}include "2026.bean"\n`,
      "2026.bean": "; this year\n",
    });
    f.state.afterLoad = [
      (files) => {
        files.set(
          "main.bean",
          files.get("main.bean")!.replace(`${LATER}\n`, ""),
        );
        files.set("2026.bean", `${files.get("2026.bean")}${LATER}\n`);
      },
    ];

    await expect(
      f.service.deleteMultiSourceSlices({
        ...LEDGER,
        entries: [PROBE_REF, LATER_REF],
      }),
    ).rejects.toThrow("it has changed since it was loaded");
    expect(f.state.commits).toEqual([]);
  });
});

describe("a move into a file the ledger cannot read as text", () => {
  it("is refused before anything is checked or committed", async () => {
    const f = fixture({ "main.bean": MAIN, "archive.bean": "bin\0ary\n" });
    // The loader stores an undecodable file as its sentinel (w23/011).
    loadMock.mockImplementation(async () => ({
      files: { "main.bean": MAIN, "archive.bean": UNDECODABLE_SOURCE },
      entryPoint: "main.bean",
      repoPaths: ["main.bean", "archive.bean"],
      sourceFiles: ["main.bean"],
      managedPrices: [],
      managedPricePaths: [],
    }));

    const outcome = WRITES.move.run(f.service);
    await expect(outcome).rejects.toBeInstanceOf(BadUserInputError);
    await expect(outcome).rejects.toThrow(
      "archive.bean is not text the ledger can read",
    );
    expect(f.state.commits).toEqual([]);
  });
});
