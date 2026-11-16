jest.mock("@/shared/logger", () => ({
  logger: {
    child: () => ({
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    }),
    warn: jest.fn(),
  },
}));

import http from "node:http";
import Koa from "koa";
import Router from "@koa/router";
import type { AppConfig } from "@/config/config";
import { clearRateLimitStores } from "@/shared/rate-limiter";
import { setGitProxyHandler } from "../git-proxy-handler";

/**
 * A Git client that hangs up must end the proxied Gitea request (w0/056).
 * Real sockets on both sides: the client is an HTTP request aborted mid-way,
 * and "ends" is observed as the stand-in Gitea's socket closing.
 */
type Handler = (req: http.IncomingMessage, res: http.ServerResponse) => void;

let handler: Handler;
const upstream: http.IncomingMessage[] = [];
let gitea: http.Server;
let proxy: http.Server;
let proxyUrl: string;

async function listen(server: http.Server) {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  return `http://127.0.0.1:${(server.address() as { port: number }).port}`;
}

function closed(req: http.IncomingMessage, ms = 2_000) {
  return new Promise<"closed" | "still open">((resolve) => {
    const timer = setTimeout(() => resolve("still open"), ms);
    req.socket.once("close", () => {
      clearTimeout(timer);
      resolve("closed");
    });
  });
}

beforeAll(async () => {
  gitea = http.createServer((req, res) => {
    upstream.push(req);
    handler(req, res);
  });
  const giteaUrl = await listen(gitea);
  const router = new Router();
  setGitProxyHandler(
    router,
    {
      database: {
        db: {},
        models: { user: { getUserByUsername: async () => null } },
      },
      services: {},
      clients: {},
    } as never,
    {
      gitea: { internalBaseUrl: giteaUrl },
      gitHttp: { passwordAuth: "allow" },
      dashboard: { url: "https://app.example.com" },
    } as unknown as AppConfig,
  );
  const app = new Koa();
  app.silent = true;
  app.use(router.routes());
  proxy = http.createServer(app.callback());
  proxyUrl = await listen(proxy);
});

afterAll(async () => {
  for (const server of [proxy, gitea]) {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

beforeEach(() => {
  upstream.length = 0;
  clearRateLimitStores();
});

function uploadPack(signal: AbortSignal) {
  return fetch(`${proxyUrl}/git/alice/book.git/git-upload-pack`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from("alice:pw").toString("base64")}`,
      "Content-Type": "application/x-git-upload-pack-request",
    },
    body: "0000",
    signal,
  });
}

async function firstUpstreamRequest() {
  while (upstream.length === 0)
    await new Promise((resolve) => setImmediate(resolve));
  return upstream[0];
}

describe("Git HTTP proxy client disconnects", () => {
  it("ends the Gitea request when the client hangs up mid-response", async () => {
    handler = (_req, res) => {
      // A large pack: one chunk now, the rest never — only the client ends it.
      res.setHeader("Content-Type", "application/x-git-upload-pack-result");
      res.write(Buffer.alloc(64 * 1024));
    };
    const client = new AbortController();
    const response = await uploadPack(client.signal);
    await response.body!.getReader().read();
    const socket = closed(await firstUpstreamRequest());
    client.abort();
    expect(await socket).toBe("closed");
  });

  it("ends the Gitea request when the client hangs up before Gitea answers", async () => {
    handler = () => {
      // Still building the pack.
    };
    const client = new AbortController();
    const pending = uploadPack(client.signal).catch(() => undefined);
    const socket = closed(await firstUpstreamRequest());
    client.abort();
    await pending;
    expect(await socket).toBe("closed");
  });
});
