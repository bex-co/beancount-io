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
const MAIN =
  "2026-01-01 open Assets:Cash USD\n2026-01-01 open Equity:Opening\n";
const b64 = (text: string) => Buffer.from(text, "utf8").toString("base64");
const fromB64 = (text: string) => Buffer.from(text, "base64").toString("utf8");

let baselineErrors: {
  message: string;
  source?: { filename: string; lineno: number };
}[] = [];
const committed: { files: { path: string; content: string }[] }[] = [];

jest.mock("@/server/auth", () => ({
  authMiddleware: async (_ctx: unknown, next: () => Promise<void>) => next(),
  directiveLimitExempt: () => true,
  giteaClientForRequest: () => ({
    repos: {
      repoGetContents: async (_owner: string, _repo: string, path: string) => {
        if (path !== "main.bean")
          throw Object.assign(new Error("404"), { status: 404 });
        return { data: { content: b64(MAIN), sha: "sha-main" } };
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

let baselineReads = 0;

jest.mock("../service-context", () => ({
  ...jest.requireActual("../service-context"),
  servicesForRequest: () => ({
    data: {
      getErrors: async () => {
        baselineReads += 1;
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
      // Every file the write touches is already included.
      projectedSourceFiles: async ({
        overlays,
      }: {
        overlays: { path: string }[];
      }) => overlays.map((overlay) => overlay.path),
    },
  }),
}));

async function listen(server: http.Server): Promise<string> {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  return `http://127.0.0.1:${(server.address() as { port: number }).port}`;
}

describe("bulk entries refuse a write that adds ledger errors", () => {
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
    baselineReads = 0;
    committed.length = 0;
  });

  const post = (body: Record<string, unknown>) =>
    fetch(`${url}/entries/alice/books/bulk`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  const open = (account: string) => ({
    type: "open",
    item: { date: "2026-10-17", account, currencies: ["USD"] },
  });

  it("refuses a second open of an open account and commits nothing", async () => {
    const response = await post({ entries: [open("Assets:Cash")] });
    const body = (await response.json()) as Record<string, any>;
    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.code).toBe("NEW_LEDGER_ERRORS");
    expect(body.details.count).toBe(1);
    expect(body.details.detail).toMatch(
      /^Duplicate open directive for Assets:Cash \(main\.bean:\d+\)$/,
    );
    expect(body.error).toMatch(/would introduce 1 new bean-check error/);
    expect(committed).toEqual([]);
  });

  it("records the same entry when allowInvalid asks for it", async () => {
    const response = await post({
      entries: [open("Assets:Cash")],
      allowInvalid: true,
    });
    expect(response.status).toBe(200);
    expect(committed).toHaveLength(1);
    expect(fromB64(committed[0].files[0].content)).toMatch(/open Assets:Cash/);
  });

  it("commits a write that adds no error", async () => {
    const response = await post({ entries: [open("Assets:Savings")] });
    expect(response.status).toBe(200);
    expect(committed).toHaveLength(1);
    // The baseline is read for the reported counts even when the projection
    // is clean (w23/161).
    expect(baselineReads).toBe(1);
  });

  it("does not blame the write for errors the ledger already had", async () => {
    baselineErrors = [
      {
        message: "Balance failed for Assets:Cash",
        source: { filename: "main.bean", lineno: 2 },
      },
    ];
    const response = await post({ entries: [open("Assets:Savings")] });
    expect(response.status).toBe(200);
    expect(committed).toHaveLength(1);
  });

  // w23/161: allowInvalid suppresses only the refusal. The projection is
  // checked and reported either way — a forced write names what it adds.
  it("reports the projection on a forced commit", async () => {
    const response = await post({
      entries: [open("Assets:Cash")],
      allowInvalid: true,
    });
    const body = (await response.json()) as Record<string, any>;
    expect(response.status).toBe(200);
    expect(committed).toHaveLength(1);
    expect(body.data.errors_before).toBe(0);
    expect(body.data.errors_after).toBe(1);
    expect(body.data.new_errors).toEqual([
      {
        message: "Duplicate open directive for Assets:Cash",
        source: { filename: "main.bean", lineno: 4 },
      },
    ]);
  });

  it("reports the would-be errors on a forced dry run", async () => {
    const response = await post({
      entries: [open("Assets:Cash")],
      allowInvalid: true,
      dryRun: true,
    });
    const body = (await response.json()) as Record<string, any>;
    expect(response.status).toBe(200);
    expect(committed).toEqual([]);
    expect(body.data.errors_before).toBe(0);
    expect(body.data.errors_after).toBe(1);
    expect(body.data.new_errors).toEqual([
      {
        message: "Duplicate open directive for Assets:Cash",
        source: { filename: "main.bean", lineno: 4 },
      },
    ]);
  });

  it("refuses breaking entries on a dry run without the flag", async () => {
    const response = await post({
      entries: [open("Assets:Cash")],
      dryRun: true,
    });
    const body = (await response.json()) as Record<string, any>;
    expect(response.status).toBe(400);
    expect(body.code).toBe("NEW_LEDGER_ERRORS");
    expect(committed).toEqual([]);
  });

  it("reports a clean projection on a clean dry run", async () => {
    const response = await post({
      entries: [open("Assets:Savings")],
      dryRun: true,
    });
    const body = (await response.json()) as Record<string, any>;
    expect(response.status).toBe(200);
    expect(committed).toEqual([]);
    expect(body.data.errors_before).toBe(0);
    expect(body.data.errors_after).toBe(0);
    expect(body.data.new_errors).toEqual([]);
  });
});
