import http from "node:http";
import Koa from "koa";
import Router from "@koa/router";
import bodyParser from "koa-bodyparser";
import { setEntriesHandler } from "@/api/entries";
import { restErrorMiddleware } from "@/server/error-middleware";

// The bulk endpoint now checks its projection before committing, the order
// the text-append route uses (w0/m2). The engine's diagnosis is scripted here
// (unit tests are WASM-free); what is under test is the handler: baseline vs
// projection, the refusal envelope, allowInvalid, and that a refusal commits
// nothing.
const LF_MAIN =
  "2026-01-01 open Assets:Cash USD\n2026-01-01 open Equity:Opening\n";
let MAIN = LF_MAIN;
// Raw bytes for main.bean when a test needs a file that is not valid UTF-8.
let mainBytes: Buffer | null = null;
const b64 = (text: string) => Buffer.from(text, "utf8").toString("base64");
const fromB64 = (text: string) => Buffer.from(text, "base64").toString("utf8");

let baselineErrors: {
  message: string;
  source?: { filename: string; lineno: number };
}[] = [];
const committed: { files: { path: string; content: string }[] }[] = [];
// Paths the handler read; a refused amount must not read any file.
const reads: string[] = [];
// Repository files besides main.bean, and the paths the include closure
// leaves out (w23/062); by default everything the write touches is loaded.
const mockFiles = new Map<string, string>();
let unincluded = new Set<string>();
// The ranges each committed write asked to locate (w23/060), and whether the
// scripted locator fails or finds nothing.
const located: { file: string; startLine: number; lineCount: number }[][] = [];
let locator: "lines" | "throws" | "misses" = "lines";

jest.mock("@/server/auth", () => ({
  authMiddleware: async (_ctx: unknown, next: () => Promise<void>) => next(),
  directiveLimitExempt: () => true,
  giteaClientForRequest: () => ({
    repos: {
      repoGetContents: async (_owner: string, _repo: string, path: string) => {
        reads.push(path);
        if (path === "main.bean" && mainBytes) {
          return {
            data: {
              content: mainBytes.toString("base64"),
              sha: "sha-main.bean",
            },
          };
        }
        const content = path === "main.bean" ? MAIN : mockFiles.get(path);
        if (content === undefined)
          throw Object.assign(new Error("404"), { status: 404 });
        return { data: { content: b64(content), sha: `sha-${path}` } };
      },
      repoChangeFiles: async (
        _owner: string,
        _repo: string,
        body: { files: { path: string; content: string }[] },
      ) => {
        committed.push(body);
        return { data: {} };
      },
    },
  }),
}));

jest.mock("@/core/directive-limit", () => ({
  checkDirectiveLimitForFileChanges: async () => undefined,
}));

// A stand-in for bean-check: a second `open` of one account is the engine's
// duplicate-open error on the line that repeats it.
function errorsOf(text: string) {
  const seen = new Set<string>();
  const errors = [...baselineErrors];
  text.split("\n").forEach((line, index) => {
    const account = /\bopen (\S+)/.exec(line)?.[1];
    if (!account) return;
    if (seen.has(account)) {
      errors.push({
        message: `Duplicate open directive for ${account}`,
        source: { filename: "main.bean", lineno: index + 1 },
      });
    }
    seen.add(account);
  });
  return errors;
}

jest.mock("../service-context", () => ({
  ...jest.requireActual("../service-context"),
  servicesForRequest: () => ({
    data: {
      getErrors: async () => {
        return errorsOf(MAIN);
      },
      checkProjectedErrors: async ({
        overlays,
      }: {
        overlays: { path: string; content: string }[];
      }) => {
        const main = overlays.find((overlay) => overlay.path === "main.bean");
        return errorsOf(main ? fromB64(main.content) : MAIN);
      },
      projectedSourceFiles: async ({
        overlays,
      }: {
        overlays: { path: string }[];
      }) =>
        ["main.bean", ...overlays.map((overlay) => overlay.path)].filter(
          (path) => !unincluded.has(path),
        ),
      // A stand-in for the engine's entry IDs: the dated line a range starts
      // on, so a test sees which line each entry was located at.
      projectedEntryIds: async ({
        overlays,
        ranges,
      }: {
        overlays: { path: string; content: string }[];
        ranges: { file: string; startLine: number; lineCount: number }[];
      }) => {
        located.push(ranges);
        if (locator === "throws") throw new Error("parse failed");
        return ranges.map(({ file, startLine, lineCount }, index) => {
          if (locator === "misses" && index === 1) return null;
          const overlay = overlays.find((candidate) => candidate.path === file);
          const lines = fromB64(overlay?.content ?? "").split("\n");
          return (
            lines
              .slice(startLine, startLine + lineCount)
              .find((line) => /^\d{4}-/.test(line)) ?? null
          );
        });
      },
    },
  }),
}));

async function listen(server: http.Server): Promise<string> {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  return `http://127.0.0.1:${(server.address() as { port: number }).port}`;
}

describe("bulk entries refuse amounts that are not decimals (w3/641)", () => {
  let server: http.Server;
  let url: string;

  beforeAll(async () => {
    const app = new Koa();
    const router = new Router();
    setEntriesHandler(router);
    app.use(restErrorMiddleware());
    app.use(bodyParser());
    app.use(router.routes());
    server = http.createServer(app.callback());
    url = await listen(server);
  });

  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  beforeEach(() => {
    MAIN = LF_MAIN;
    mainBytes = null;
    baselineErrors = [];
    committed.length = 0;
    reads.length = 0;
  });

  const post = (entries: unknown[]) =>
    fetch(`${url}/entries/alice/books/bulk`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ entries }),
    });
  const transaction = (first: string, second: string) => ({
    type: "transaction",
    item: {
      date: "2026-10-17",
      flag: "*",
      narration: "synthetic",
      postings: [
        { account: "Assets:Cash", units: { number: first, currency: "USD" } },
        {
          account: "Equity:Opening",
          units: { number: second, currency: "USD" },
        },
      ],
    },
  });

  it.each([
    ["(12.50)", "-(12.50)", 'postings[0].units.number "(12.50)"'],
    ["-1,234.56", "1,234.56", 'postings[0].units.number "-1,234.56"'],
    ["12.50", "$-12.50", 'postings[1].units.number "$-12.50"'],
  ])(
    "refuses posting %s / %s as bad input naming the field",
    async (first, second, field) => {
      const response = await post([transaction(first, second)]);
      const body = (await response.json()) as Record<string, any>;

      // A plain refusal: 400, not the 500 a throwing parse became.
      expect(response.status).toBe(400);
      expect(body.error).toBe(`entry 0: ${field} is not a decimal number`);
      expect(reads).toEqual([]);
      expect(committed).toEqual([]);
    },
  );

  it.each([
    [
      "balance",
      {
        date: "2026-09-07",
        account: "Assets:Cash",
        amount: { number: "abc", currency: "USD" },
      },
    ],
    [
      "price",
      {
        date: "2026-09-07",
        currency: "XYZ",
        amount: { number: "1,5", currency: "USD" },
      },
    ],
  ])("refuses a %s amount that is not a number", async (type, item) => {
    const response = await post([{ type, item }]);
    const body = (await response.json()) as Record<string, any>;

    expect(response.status).toBe(400);
    expect(body.error).toMatch(
      /^entry 0: amount\.number ".+" is not a decimal number$/,
    );
    expect(committed).toEqual([]);
  });

  it.each([
    ["-3.21", "3.21"],
    ["1e-7", "-1e-7"],
  ])("still writes %s / %s", async (first, second) => {
    const response = await post([transaction(first, second)]);

    expect(response.status).toBe(200);
    expect(committed).toHaveLength(1);
  });

  // w23/043: accepted by the decimal check, unreadable to Beancount as typed.
  it("writes a leading-dot amount with its zero", async () => {
    const response = await post([transaction(".5", "-.5")]);
    expect(response.status).toBe(200);
    const written = fromB64(committed[0]!.files[0]!.content);
    expect(written).toMatch(/Assets:Cash +0\.5 USD/);
    expect(written).toMatch(/Equity:Opening +-0\.5 USD/);
  });
});

// w21/673: an entry added to a CRLF file was appended with bare LFs.
describe("bulk entries keep the file's line ending", () => {
  let server: http.Server;
  let url: string;

  beforeAll(async () => {
    const app = new Koa();
    const router = new Router();
    setEntriesHandler(router);
    app.use(restErrorMiddleware());
    app.use(bodyParser());
    app.use(router.routes());
    server = http.createServer(app.callback());
    url = await listen(server);
  });

  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  beforeEach(() => {
    MAIN = LF_MAIN;
    mainBytes = null;
    baselineErrors = [];
    committed.length = 0;
  });

  const add = () =>
    fetch(`${url}/entries/alice/books/bulk`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        entries: [
          {
            type: "transaction",
            item: {
              date: "2026-10-22",
              flag: "*",
              narration: "Coffee",
              postings: [
                {
                  account: "Assets:Cash",
                  units: { number: "-3.00", currency: "USD" },
                },
                {
                  account: "Equity:Opening",
                  units: { number: "3.00", currency: "USD" },
                },
              ],
            },
          },
        ],
      }),
    });

  it("writes CRLF throughout a CRLF file", async () => {
    MAIN = LF_MAIN.replace(/\n/g, "\r\n");
    expect((await add()).status).toBe(200);
    const written = fromB64(committed[0]!.files[0]!.content);
    expect(written).toContain("Coffee");
    expect(written.replace(/\r\n/g, "")).not.toContain("\n");
  });

  // w21/679: a Latin-1 file was decoded leniently and written back with U+FFFD.
  // w21/680: a NUL in the narration was committed and the file stopped loading.
  it("refuses a NUL in the narration, committing nothing", async () => {
    const response = await fetch(`${url}/entries/alice/books/bulk`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        entries: [
          {
            type: "transaction",
            item: {
              date: "2026-10-22",
              flag: "*",
              narration: "qa nul a\u0000b",
              postings: [],
            },
          },
        ],
      }),
    });
    expect(response.status).toBe(400);
    expect(((await response.json()) as { error: string }).error).toContain(
      "narration contains the control character U+0000",
    );
    expect(committed).toEqual([]);
  });

  it("refuses a file that is not valid UTF-8, committing nothing", async () => {
    mainBytes = Buffer.from("; Caf\xe9 latin-1\n", "latin1");
    const response = await add();
    expect(response.status).toBe(400);
    expect(((await response.json()) as { error: string }).error).toContain(
      "main.bean is not valid UTF-8",
    );
    expect(committed).toEqual([]);
  });

  it("keeps a leading byte order mark", async () => {
    mainBytes = Buffer.from(`\ufeff${LF_MAIN}`, "utf8");
    expect((await add()).status).toBe(200);
    expect(fromB64(committed[0]!.files[0]!.content).startsWith("\ufeff")).toBe(
      true,
    );
  });

  it("leaves an LF file LF", async () => {
    expect((await add()).status).toBe(200);
    const written = fromB64(committed[0]!.files[0]!.content);
    expect(written).not.toContain("\r");
  });
});

// w23/033: tags, links, flags, accounts, currencies, meta keys and dates were
// written raw, so a newline in one smuggled whole directives into the ledger.
describe("bulk entries refuse tokens that would not lex as written", () => {
  let server: http.Server;
  let url: string;

  beforeAll(async () => {
    const app = new Koa();
    const router = new Router();
    setEntriesHandler(router);
    app.use(restErrorMiddleware());
    app.use(bodyParser());
    app.use(router.routes());
    server = http.createServer(app.callback());
    url = await listen(server);
  });

  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  beforeEach(() => {
    baselineErrors = [];
    committed.length = 0;
    reads.length = 0;
  });

  const post = (entries: unknown[]) =>
    fetch(`${url}/entries/alice/books/bulk`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ entries }),
    });
  const transaction = (overrides: Record<string, unknown> = {}) => ({
    type: "transaction",
    item: {
      date: "2026-03-20",
      flag: "*",
      payee: "qa-tag",
      narration: "qa",
      postings: [
        { account: "Assets:Cash", units: { number: "-0.01", currency: "USD" } },
        {
          account: "Equity:Opening",
          units: { number: "0.01", currency: "USD" },
        },
      ],
      ...overrides,
    },
  });
  const posting = (overrides: Record<string, unknown>) => ({
    postings: [
      {
        account: "Assets:Cash",
        units: { number: "-0.01", currency: "USD" },
        ...overrides,
      },
      { account: "Equity:Opening", units: { number: "0.01", currency: "USD" } },
    ],
  });
  const INJECTED = '\n2026-03-20 note Assets:Cash "qa-injected"\n2026-03-20 *';

  it.each([
    ["tags[0]", { tags: [`qa${INJECTED}`] }],
    ["links[0]", { links: ["two words"] }],
    ["flag", { flag: `*${INJECTED}` }],
    ["date", { date: "2026-03-20 open Assets:Evil\n2026-03-20" }],
    ["meta.bad key", { meta: { "bad key": "x" } }],
    ["postings[0].account", posting({ account: `Assets:Cash${INJECTED}` })],
    ["postings[0].flag", posting({ flag: "! x" })],
    [
      "postings[0].units.currency",
      posting({ units: { number: "-0.01", currency: "USD\n2026" } }),
    ],
  ])("refuses %s before reading anything", async (field, overrides) => {
    const response = await post([transaction(overrides)]);
    const body = (await response.json()) as Record<string, any>;
    expect(response.status).toBe(400);
    expect(body.error).toMatch(
      new RegExp(
        `^entry 0: ${field.replace(/[[\].]/g, "\\$&")} .* is not a valid `,
      ),
    );
    expect(reads).toEqual([]);
    expect(committed).toEqual([]);
  });

  it.each([
    [
      "open",
      {
        date: "2026-03-20",
        account: "Assets:Cash",
        currencies: ["USD", "EUR GBP"],
      },
      "currencies[1]",
    ],
    [
      "note",
      { date: "2026-03-20", account: "Assets:Cash\nx", comment: "c" },
      "account",
    ],
    ["commodity", { date: "2026-03-20", currency: "usd" }, "currency"],
  ])("refuses a bad token in a %s", async (type, item, field) => {
    const response = await post([{ type, item }]);
    const body = (await response.json()) as Record<string, any>;
    expect(response.status).toBe(400);
    expect(body.error).toContain(`entry 0: ${field} `);
    expect(committed).toEqual([]);
  });

  it("still writes Unicode accounts, and tags, links and meta", async () => {
    const response = await post([
      transaction({
        tags: ["trip-2026"],
        links: ["inv/2026.03"],
        meta: { "receipt-id": "A1" },
        postings: [
          {
            account: "Assets:Café",
            units: { number: "-0.01", currency: "USD" },
          },
          { account: "资产:现金", units: { number: "0.01", currency: "USD" } },
        ],
      }),
    ]);
    expect(response.status).toBe(200);
    expect(committed).toHaveLength(1);
    const written = fromB64(committed[0]!.files[0]!.content);
    expect(written).toContain(
      '2026-03-20 * "qa-tag" "qa" #trip-2026 ^inv/2026.03',
    );
    expect(written).toContain("资产:现金");
  });

  // w21/649: a ZWNJ is part of the Persian word; both engines read it.
  it("opens an account whose name holds a ZWNJ", async () => {
    const response = await post([
      {
        type: "open",
        item: { date: "2026-03-20", account: "Assets:Bank:خانه\u200cها" },
      },
    ]);
    expect(response.status).toBe(200);
    expect(fromB64(committed[0]!.files[0]!.content)).toContain(
      "2026-03-20 open Assets:Bank:خانه\u200cها",
    );
  });

  // w21/653: the engines' lexers read tags as ASCII, so `#旅行` was dropped
  // (and `#café` read as `#caf`); the validator names the field instead.
  it("refuses a non-ASCII tag with the validator's message", async () => {
    const response = await post([transaction({ tags: ["旅行"] })]);
    const body = (await response.json()) as Record<string, any>;
    expect(response.status).toBe(400);
    expect(body.error).toContain('entry 0: tags[0] "旅行" is not a valid tag');
    expect(committed).toEqual([]);
  });
});

// w23/058: a receipt insert stored its file before the entry was checked, so
// a refused entry left an orphan. A dry run answers first, committing nothing.
describe("bulk entries dry run", () => {
  let server: http.Server;
  let url: string;

  beforeAll(async () => {
    const app = new Koa();
    const router = new Router();
    setEntriesHandler(router);
    app.use(restErrorMiddleware());
    app.use(bodyParser());
    app.use(router.routes());
    server = http.createServer(app.callback());
    url = await listen(server);
  });

  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  beforeEach(() => {
    baselineErrors = [];
    committed.length = 0;
  });

  const post = (body: Record<string, unknown>) =>
    fetch(`${url}/entries/alice/books/bulk`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  const txn = (second: string) => ({
    type: "transaction",
    item: {
      date: "2026-08-30",
      flag: "*",
      narration: "receipt",
      postings: [
        { account: "Assets:Cash", units: { number: "-2.00", currency: "USD" } },
        {
          account: "Equity:Opening",
          units: { number: second, currency: "USD" },
        },
      ],
    },
  });

  it("accepts a valid entry and commits nothing", async () => {
    const response = await post({ entries: [txn("2.00")], dryRun: true });
    expect(response.status).toBe(200);
    expect(committed).toEqual([]);
  });

  it("refuses an unbalanced entry exactly as the write would", async () => {
    const response = await post({ entries: [txn("1.00")], dryRun: true });
    expect(response.status).toBe(400);
    expect(((await response.json()) as { code: string }).code).toBe(
      "UNBALANCED",
    );
    expect(committed).toEqual([]);
  });

  // w21/647: a balanced exchange at a price was refused as UNBALANCED.
  it("balances a priced posting by its weight", async () => {
    const exchange = (price: string) => ({
      type: "transaction",
      item: {
        date: "2026-08-30",
        flag: "*",
        narration: "exchange",
        postings: [
          {
            account: "Assets:Cash",
            units: { number: "-110.00", currency: "USD" },
          },
          {
            account: "Equity:Opening",
            units: { number: "100.00", currency: "EUR" },
            price: { number: price, currency: "USD" },
          },
        ],
      },
    });
    expect(
      (await post({ entries: [exchange("1.10")], dryRun: true })).status,
    ).toBe(200);
    const refused = await post({ entries: [exchange("1.20")], dryRun: true });
    expect(refused.status).toBe(400);
    expect(((await refused.json()) as { code: string }).code).toBe(
      "UNBALANCED",
    );
  });

  it("checks against an empty file when the routed target does not exist yet", async () => {
    const response = await post({
      entries: [{ ...txn("2.00"), filename: "txns/2026.bean" }],
      dryRun: true,
    });
    expect(response.status).toBe(200);
    expect(committed).toEqual([]);
  });

  it("still commits without dryRun", async () => {
    expect((await post({ entries: [txn("2.00")] })).status).toBe(200);
    expect(committed).toHaveLength(1);
  });
});

// w23/060: the write returned no hashes, so an agent could not verify or undo
// the entry it had just added without guessing through a listing.
describe("bulk entries return the hashes they wrote", () => {
  let server: http.Server;
  let url: string;

  beforeAll(async () => {
    const app = new Koa();
    const router = new Router();
    setEntriesHandler(router);
    app.use(restErrorMiddleware());
    app.use(bodyParser());
    app.use(router.routes());
    server = http.createServer(app.callback());
    url = await listen(server);
  });

  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  beforeEach(() => {
    baselineErrors = [];
    committed.length = 0;
    located.length = 0;
    locator = "lines";
  });

  const post = async (entries: unknown[]) => {
    const response = await fetch(`${url}/entries/alice/books/bulk`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ entries }),
    });
    expect(response.status).toBe(200);
    return (
      (await response.json()) as { data: { entry_hashes: (string | null)[] } }
    ).data.entry_hashes;
  };
  const txn = (date: string, narration: string) => ({
    type: "transaction",
    item: {
      date,
      flag: "*",
      narration,
      postings: [
        { account: "Assets:Cash", units: { number: "-2.00", currency: "USD" } },
        {
          account: "Equity:Opening",
          units: { number: "2.00", currency: "USD" },
        },
      ],
    },
  });
  const entries = [
    txn("2026-08-30", "first"),
    {
      type: "balance",
      item: {
        date: "2026-08-31",
        account: "Assets:Cash",
        amount: { number: "-2.00", currency: "USD" },
      },
    },
    txn("2026-09-01", "third"),
  ];

  it("locates every entry on its own lines and answers in request order", async () => {
    const hashes = await post(entries);

    expect(hashes).toHaveLength(3);
    expect(hashes[0]).toMatch(/^2026-08-30 \* "first"/);
    expect(hashes[1]).toMatch(/^2026-08-31 balance Assets:Cash/);
    expect(hashes[2]).toMatch(/^2026-09-01 \* "third"/);
    // Each range ends before the next begins, inside the committed text.
    const [ranges] = located;
    ranges.slice(1).forEach((range, index) => {
      const previous = ranges[index];
      expect(previous.startLine + previous.lineCount).toBeLessThanOrEqual(
        range.startLine,
      );
    });
    expect(committed).toHaveLength(1);
  });

  it("keeps the commit and answers no hashes when they cannot be resolved", async () => {
    locator = "throws";
    expect(await post(entries)).toEqual([]);
    locator = "misses";
    expect(await post(entries)).toEqual([]);
    expect(committed).toHaveLength(2);
  });
});

// w23/062: a routed write to a file nothing includes committed entries that
// no report loaded, and said "No new bean-check errors" about them.
describe("bulk entries include a routed file the ledger does not load", () => {
  let server: http.Server;
  let url: string;

  beforeAll(async () => {
    const app = new Koa();
    const router = new Router();
    setEntriesHandler(router);
    app.use(restErrorMiddleware());
    app.use(bodyParser());
    app.use(router.routes());
    server = http.createServer(app.callback());
    url = await listen(server);
  });

  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  beforeEach(() => {
    baselineErrors = [];
    committed.length = 0;
    mockFiles.clear();
    mockFiles.set("txns/2027.bean", "");
    unincluded = new Set(["txns/2027.bean"]);
  });

  afterEach(() => {
    mockFiles.clear();
    unincluded = new Set();
  });

  const post = (body: Record<string, unknown>) =>
    fetch(`${url}/entries/alice/books/bulk`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  const routed = (filename: string) => ({
    type: "transaction",
    filename,
    item: {
      date: "2027-01-03",
      flag: "*",
      narration: "new year",
      postings: [
        { account: "Assets:Cash", units: { number: "-5.00", currency: "USD" } },
        {
          account: "Equity:Opening",
          units: { number: "5.00", currency: "USD" },
        },
      ],
    },
  });

  it("adds the entry point's include in the same commit and names it", async () => {
    const response = await post({ entries: [routed("txns/2027.bean")] });

    expect(response.status).toBe(200);
    expect(
      ((await response.json()) as { data: { included_files: string[] } }).data
        .included_files,
    ).toEqual(["txns/2027.bean"]);
    expect(committed).toHaveLength(1);
    const files = Object.fromEntries(
      committed[0]!.files.map((file) => [file.path, fromB64(file.content)]),
    );
    expect(Object.keys(files).sort()).toEqual(["main.bean", "txns/2027.bean"]);
    expect(files["main.bean"]).toBe(`${MAIN}include "txns/2027.bean"\n`);
    expect(files["txns/2027.bean"]).toContain('2027-01-03 * "new year"');
  });

  it("includes a file a dry run would create, committing nothing", async () => {
    mockFiles.clear();
    const response = await post({
      entries: [routed("txns/2027.bean")],
      dryRun: true,
    });
    expect(response.status).toBe(200);
    expect(
      ((await response.json()) as { data: { included_files: string[] } }).data
        .included_files,
    ).toEqual(["txns/2027.bean"]);
    expect(committed).toEqual([]);
  });

  it("leaves the entry point alone when the file is already loaded", async () => {
    unincluded = new Set();
    const response = await post({ entries: [routed("txns/2027.bean")] });
    expect(response.status).toBe(200);
    expect(
      ((await response.json()) as { data: { included_files: string[] } }).data
        .included_files,
    ).toEqual([]);
    expect(committed[0]!.files.map((file) => file.path)).toEqual([
      "txns/2027.bean",
    ]);
  });
});
