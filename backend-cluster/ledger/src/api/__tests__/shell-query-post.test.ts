import http from "node:http";
import Koa from "koa";
import Router from "@koa/router";
import bodyParser from "koa-bodyparser";
import { setShellHandler } from "@/api/shell";
import { restErrorMiddleware } from "@/server/error-middleware";

// The engine is scripted (unit tests are WASM-free); what is under test is
// the route: a long query in a POST body reaches the service intact through
// the real HTTP stack, the GET twin still works, and a missing body query
// reads as the empty query exactly like a missing GET parameter.
const received: { query: string; text: boolean }[] = [];

jest.mock("@/server/auth", () => ({
  authMiddleware: async (_ctx: unknown, next: () => Promise<void>) => next(),
  directiveLimitExempt: () => true,
  giteaClientForRequest: () => ({}),
}));

jest.mock("../service-context", () => ({
  ...jest.requireActual("../service-context"),
  servicesForRequest: () => ({
    shell: {
      queryShell: async ({ query }: { query: string }) => {
        received.push({ query, text: false });
        return {
          resultType: "table",
          table: { types: [], rows: [[query.length]] },
        };
      },
      queryShellText: async ({ query }: { query: string }) => {
        received.push({ query, text: true });
        return { text: `len=${query.length}`, rowCount: 1 };
      },
    },
  }),
}));

async function listen(server: http.Server): Promise<string> {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  return `http://127.0.0.1:${(server.address() as { port: number }).port}`;
}

describe("shell query POST twins (w23/m5/t002)", () => {
  let server: http.Server;
  let url: string;

  beforeAll(async () => {
    const app = new Koa();
    const router = new Router();
    setShellHandler(router);
    app.use(restErrorMiddleware());
    app.use(bodyParser());
    app.use(router.routes());
    server = http.createServer(app.callback());
    url = await listen(server);
  });

  afterAll(
    () => new Promise<void>((resolve) => server.close(() => resolve())),
  );

  beforeEach(() => {
    received.length = 0;
  });

  it("runs a 60 KB query from a POST body, past the GET parser cliff", async () => {
    // 60 KB URL-encoded would die as a bare 431 in the HTTP parser (t001);
    // in a body the same text reaches the service byte-identical.
    const query = `SELECT 'A' WHERE bx = '${"A".repeat(60_000)}'`;
    const res = await fetch(`${url}/shell/o/r/query`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      success: boolean;
      data: { result: { rows: number[][] } };
    };
    expect(body.success).toBe(true);
    expect(body.data.result.rows).toEqual([[query.length]]);
    expect(received).toHaveLength(1);
    expect(received[0]?.query).toBe(query);
  });

  it("runs a 60 KB query-text from a POST body", async () => {
    const query = `SELECT '${"B".repeat(60_000)}'`;
    const res = await fetch(`${url}/shell/o/r/query-text`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      success: boolean;
      data: { text: string; rowCount: number };
    };
    expect(body.success).toBe(true);
    expect(body.data.text).toBe(`len=${query.length}`);
    expect(received[0]?.query).toBe(query);
    expect(received[0]?.text).toBe(true);
  });

  it("reads a missing body query as the empty query, like the GET twin", async () => {
    const res = await fetch(`${url}/shell/o/r/query`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(200);
    expect(received[0]?.query).toBe("");
  });

  it("keeps serving short queries over GET", async () => {
    const query = "SELECT 1";
    const res = await fetch(
      `${url}/shell/o/r/query?query=${encodeURIComponent(query)}`,
    );
    expect(res.status).toBe(200);
    expect(received[0]?.query).toBe(query);
  });
});
