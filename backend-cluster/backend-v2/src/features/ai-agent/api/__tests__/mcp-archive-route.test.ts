import "reflect-metadata";
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));
jest.mock("@/server/api/identity", () => ({
  ...jest.requireActual("@/server/api/identity"),
  resolveIdentity: jest.fn(),
}));
jest.mock("@/server/api/rate-limit", () => ({
  ...jest.requireActual("@/server/api/rate-limit"),
  enforceRateLimit: jest.fn(),
}));
import http from "node:http";
import Koa from "koa";
import Router from "@koa/router";
import { AuthorizationService } from "@/server/api/authorization";
import { resolveIdentity, type Identity } from "@/server/api/identity";
import { enforceRateLimit } from "@/server/api/rate-limit";
import { restErrorMiddleware } from "@/server/rest/error-middleware";
import { RateLimitedError } from "@/shared/errors";
import {
  pinnedReadToken,
  readOnlyToken,
  scopelessToken,
  sessionIdentity,
} from "@/server/rest/__tests__/v1-test-server";
import {
  archiveServiceFor,
  startArchiveOrigin,
  type ArchiveOrigin,
} from "@/features/ledger/service/__tests__/archive-origin";
import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import { MCP_ARCHIVE_BLOB_MAX_BYTES } from "../mcp-resources";
import { setMcpArchiveRoute } from "../mcp-archive-route";

/**
 * The streaming archive route under the MCP resource (w23/026): an MCP OAuth
 * client past the 8 MiB blob cap downloads the archive with the token it
 * already holds.
 */
const config = { oauth: { issuer: "https://issuer.test" } } as AppConfig;
const PATH = "/api-gateway/mcp/archive/alice/main/main.zip";

let origin: ArchiveOrigin;
let server: http.Server;
let base: string;
let check: jest.Mock;

beforeEach(async () => {
  jest.clearAllMocks();
  origin = await startArchiveOrigin();
  check = jest.fn().mockResolvedValue(true);
  const layers = {
    database: {},
    services: {
      ledgerArchive: archiveServiceFor(
        origin,
        new AuthorizationService({ check }, jest.fn()),
      ),
    },
  } as unknown as AppLayers;
  const router = new Router();
  router.use(restErrorMiddleware());
  setMcpArchiveRoute(router, layers, config);
  const app = new Koa();
  app.silent = true;
  app.use(router.routes());
  server = http.createServer(app.callback());
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  (resolveIdentity as jest.Mock).mockResolvedValue(readOnlyToken);
  (enforceRateLimit as jest.Mock).mockResolvedValue(undefined);
});

afterEach(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await origin.close();
});

const as = (identity: Identity | undefined) =>
  (resolveIdentity as jest.Mock).mockResolvedValue(identity);

describe("GET /api-gateway/mcp/archive/{owner}/{name}/{archive}", () => {
  it("streams an archive past the MCP blob cap, byte for byte", async () => {
    const total = MCP_ARCHIVE_BLOB_MAX_BYTES + 3 * 1024 * 1024;
    origin.serve((_req, res) => {
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", 'attachment; filename="main.zip"');
      res.end(Buffer.alloc(total, 7));
    });

    const response = await fetch(`${base}${PATH}`);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/zip");
    expect(response.headers.get("content-disposition")).toContain("main.zip");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    const bytes = Buffer.from(await response.arrayBuffer());
    expect(bytes.length).toBe(total);
    expect(bytes.every((byte) => byte === 7)).toBe(true);
  });

  it("accepts only the MCP audience, never a browser session", async () => {
    for (const identity of [undefined, sessionIdentity]) {
      as(identity);
      const response = await fetch(`${base}${PATH}`);
      expect(response.status).toBe(401);
      expect(response.headers.get("www-authenticate")).toBe(
        'Bearer resource_metadata="https://issuer.test/.well-known/oauth-protected-resource"',
      );
    }
    expect(resolveIdentity).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      config,
      { oauthResource: "mcp" },
    );
    expect(origin.requests).toHaveLength(0);
  });

  it("refuses a credential without the read capability before touching the repository", async () => {
    as(scopelessToken);
    const response = await fetch(`${base}${PATH}`);
    expect(response.status).toBe(403);
    expect(origin.requests).toHaveLength(0);
  });

  it("holds a pinned credential to its ledger", async () => {
    as(pinnedReadToken);
    const other = await fetch(
      `${base}/api-gateway/mcp/archive/alice/other/main.zip`,
    );
    expect(other.status).toBe(403);
    expect(origin.requests).toHaveLength(0);
  });

  it("rechecks ledger read authority on every fetch", async () => {
    expect((await fetch(`${base}${PATH}`)).status).toBe(200);
    check.mockResolvedValue(false);
    expect((await fetch(`${base}${PATH}`)).status).toBe(404);
    expect(origin.requests).toHaveLength(1);
  });

  it("charges the shared archive budget and passes Retry-After on a refusal", async () => {
    expect((await fetch(`${base}${PATH}`)).status).toBe(200);
    expect(enforceRateLimit).toHaveBeenCalledWith(
      expect.objectContaining({
        opId: "REST GET /api-gateway/mcp/archive/{owner}/{name}/{archive}",
        identity: readOnlyToken,
      }),
    );

    (enforceRateLimit as jest.Mock).mockRejectedValue(new RateLimitedError(17));
    const limited = await fetch(`${base}${PATH}`);
    expect(limited.status).toBe(429);
    expect(limited.headers.get("retry-after")).toBe("17");
    expect(origin.requests).toHaveLength(1);
  });

  it("refuses an unsafe or unformatted archive name before the repository", async () => {
    for (const name of ["..%2Fx.zip", "main", "main.rar"]) {
      const response = await fetch(
        `${base}/api-gateway/mcp/archive/alice/main/${name}`,
      );
      expect(response.status).toBe(400);
    }
    expect(origin.requests).toHaveLength(0);
  });
});
