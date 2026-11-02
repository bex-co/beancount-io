import http from "node:http";
import Koa from "koa";
import Router from "@koa/router";
import bodyParser from "koa-bodyparser";
import { setEntriesHandler } from "@/api/entries";
import { restErrorMiddleware } from "@/server/error-middleware";

// w23/072: a bulk entries commit that loses a race to a concurrent write fails
// with a status the conflict classifier does not know. It must read as a 409
// the caller re-reads and retries, never as an outage, and a commit that
// landed but lost its answer must not be reported as failed.
const MAIN = "2026-01-01 open Assets:Cash USD\n";
const b64 = (text: string) => Buffer.from(text, "utf8").toString("base64");

// What the file holds when the failed commit is probed.
let fileAfterFailure: { content: string; sha: string };
let changeFailure: Error | null = null;
let commits = 0;
let lastCommitted = "";

jest.mock("@/server/auth", () => ({
  authMiddleware: async (_ctx: unknown, next: () => Promise<void>) => next(),
  directiveLimitExempt: () => true,
  giteaClientForRequest: () => {
    let reads = 0;
    return {
      repos: {
        repoGetContents: async (_o: string, _r: string, path: string) => {
          if (path !== "main.bean")
            throw Object.assign(new Error("404"), { status: 404 });
          reads += 1;
          // The first read is the handler's; later reads are the probe's.
          return reads === 1
            ? { data: { content: b64(MAIN), sha: "sha-main" } }
            : {
                data: {
                  content: b64(fileAfterFailure.content),
                  sha: fileAfterFailure.sha,
                  encoding: "base64",
                },
              };
        },
        repoChangeFiles: async (
          _o: string,
          _r: string,
          body: { files: { content: string }[] },
        ) => {
          commits += 1;
          lastCommitted = body.files[0].content;
          if (changeFailure) throw changeFailure;
          return { data: {} };
        },
      },
    };
  },
}));

jest.mock("@/core/directive-limit", () => ({
  checkDirectiveLimitForFileChanges: async () => undefined,
}));

jest.mock("../service-context", () => ({
  ...jest.requireActual("../service-context"),
  servicesForRequest: () => ({
    data: {
      getErrors: async () => [],
      checkProjectedErrors: async () => [],
      projectedSourceFiles: async ({
        overlays,
      }: {
        overlays: { path: string }[];
      }) => overlays.map((overlay) => overlay.path),
    },
  }),
}));

describe("bulk entries commit that fails with an unrecognized 5xx", () => {
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
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    url = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  });
  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  beforeEach(() => {
    commits = 0;
    changeFailure = Object.assign(new Error("upstream broke"), { status: 502 });
  });

  const post = () =>
    fetch(`${url}/entries/alice/books/bulk`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        entries: [
          {
            type: "open",
            item: {
              date: "2026-10-17",
              account: "Assets:Savings",
              currencies: ["USD"],
            },
          },
        ],
      }),
    });

  it("answers 409 CONFLICT when the file moved on without the entries", async () => {
    fileAfterFailure = {
      content: MAIN + "2026-01-02 open Equity:Other\n",
      sha: "sha-other",
    };
    const response = await post();
    const body = (await response.json()) as Record<string, any>;
    expect(response.status).toBe(409);
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/concurrent write; re-read it and retry/);
    expect(commits).toBe(1);
  });

  it("answers success, without writing twice, when the commit landed", async () => {
    changeFailure = null;
    expect((await post()).status).toBe(200);
    // The same request again, now failing after its bytes are in the file.
    fileAfterFailure = {
      content: Buffer.from(lastCommitted, "base64").toString("utf8"),
      sha: "sha-landed",
    };
    changeFailure = Object.assign(new Error("lost the answer"), {
      status: 502,
    });
    commits = 0;
    const response = await post();
    expect(response.status).toBe(200);
    expect(commits).toBe(1);
  });

  it("keeps the original error when the file is unchanged", async () => {
    fileAfterFailure = { content: MAIN, sha: "sha-main" };
    const response = await post();
    expect(response.status).toBeGreaterThanOrEqual(500);
    expect(commits).toBe(1);
  });
});
