import "reflect-metadata";
import http from "node:http";
import type { Socket } from "node:net";
import { ApiClient, FavaApiError } from "../api-client";
import { favaApiErrorToDomainError } from "../error-to-domain";
import Koa from "koa";
import Router from "@koa/router";
import { envelopeFromThrown } from "@/features/ai-agent/api/mcp-errors";
import { restErrorMiddleware } from "@/server/rest/error-middleware";
import { formatError } from "@/server/graphql/format-error";

/**
 * w23/m34 — what a ledger call that never answers does, end to end.
 *
 * A real socket, because the question is whether the call ends and lets go:
 * a stub that rejects immediately cannot show a connection still held open.
 * The 30 s / 90 s deadlines are `ApiClient`'s; this uses a short one so the
 * suite stays fast, and checks the path every REST, GraphQL and MCP ledger call
 * shares — client, error translation, then the MCP envelope an agent reads.
 */
describe("a ledger call that never answers", () => {
  let server: http.Server;
  let baseUrl: string;
  const held: Socket[] = [];
  const closed: Promise<void>[] = [];

  beforeAll(async () => {
    server = http.createServer((req) => {
      // Accept the request and say nothing, like a wedged engine.
      held.push(req.socket);
      closed.push(
        new Promise((resolve) => req.socket.once("close", () => resolve())),
      );
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    baseUrl = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  });

  afterAll(async () => {
    held.forEach((socket) => socket.destroy());
    await new Promise<void>((r) => server.close(() => r()));
  });

  async function hang(timeoutMs: number): Promise<FavaApiError> {
    const client = new ApiClient({ baseUrl, timeoutMs });
    return client.request({ path: "/slow", method: "GET" }).then(
      () => {
        throw new Error("the call should not have completed");
      },
      (error: unknown) => error as FavaApiError,
    );
  }

  it("ends at the deadline with a 504 instead of waiting forever", async () => {
    const started = Date.now();
    const error = await hang(150);

    expect(error).toBeInstanceOf(FavaApiError);
    expect(error.status).toBe(504);
    expect(Date.now() - started).toBeLessThan(2000);
  });

  it("lets go of the connection, so the engine is not left holding it", async () => {
    await hang(100);

    // The server sees the client's socket close once the deadline aborts it.
    await expect(
      Promise.race([
        closed[closed.length - 1],
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("socket never closed")), 2000),
        ),
      ]),
    ).resolves.toBeUndefined();
  });

  it("tells an MCP agent the call may have landed, naming how to retry safely", async () => {
    const error = await hang(100);

    const envelope = envelopeFromThrown(
      favaApiErrorToDomainError(error, "query the ledger"),
    );

    expect(envelope.code).toBe("SERVICE_UNAVAILABLE");
    expect(envelope.hint).toContain("may already have committed");
    expect(envelope.hint).toContain("`requestId`");
    expect(envelope.message).not.toMatch(/Abort|stack|at Object/);
  });

  it("keeps the generic hint for a ledger that is simply down", () => {
    const down = new FavaApiError("upstream down", 503);

    const envelope = envelopeFromThrown(
      favaApiErrorToDomainError(down, "query the ledger"),
    );

    expect(envelope.code).toBe("SERVICE_UNAVAILABLE");
    expect(envelope.hint).toContain("A dependency is down");
    expect(envelope.hint).not.toContain("requestId");
  });

  it("carries the same hint on REST and GraphQL, from the one error", async () => {
    const domain = favaApiErrorToDomainError(await hang(100), "write");
    const mcpHint = envelopeFromThrown(domain).hint;

    const app = new Koa();
    const router = new Router();
    app.use(restErrorMiddleware());
    router.get("/x", () => {
      throw domain;
    });
    app.use(router.routes());
    const rest = http.createServer(app.callback());
    await new Promise<void>((r) => rest.listen(0, "127.0.0.1", r));
    try {
      const res = await fetch(
        `http://127.0.0.1:${(rest.address() as { port: number }).port}/x`,
      );
      const body = (await res.json()) as {
        error: { code: string; metadata: { hint: string } };
      };
      expect(res.status).toBe(503);
      expect(body.error.code).toBe("SERVICE_UNAVAILABLE");
      expect(body.error.metadata.hint).toBe(mcpHint);
    } finally {
      await new Promise<void>((r) => rest.close(() => r()));
    }

    const gql = formatError({ message: "x", extensions: {} }, domain);
    expect(gql.extensions).toMatchObject({
      code: "SERVICE_UNAVAILABLE",
      hint: mcpHint,
    });
  });
});
