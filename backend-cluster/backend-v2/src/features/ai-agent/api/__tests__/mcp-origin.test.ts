import http from "http";
import type { AddressInfo } from "net";
import Koa from "koa";
import Router from "@koa/router";
import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import { isAllowedOrigin } from "@/server/api/allowed-origin";
import { resolveIdentity } from "@/server/api/identity";
import { setMcpRoute } from "../mcp-route";

jest.mock("@/server/api/identity", () => ({ resolveIdentity: jest.fn() }));
jest.mock("@/server/api/rate-limit", () => ({
  setRouteRateLimitPolicy: jest.fn(),
}));

const config = { oauth: { issuer: "https://beancount.io" } } as AppConfig;

describe("isAllowedOrigin", () => {
  it.each([
    "https://beancount.io",
    "https://git.beancount.io",
    "http://localhost:3000",
    "http://127.0.0.1:8080",
  ])("trusts %s", (origin) => expect(isAllowedOrigin(origin)).toBe(true));

  it.each([
    "https://evil.example",
    "https://beancount.io.evil.example",
    "null",
    "not a url",
  ])("refuses %s", (origin) => expect(isAllowedOrigin(origin)).toBe(false));
});

describe("MCP route Origin validation", () => {
  let server: http.Server;
  let url: string;
  const buildMcpServer = jest.fn();

  beforeAll(async () => {
    const router = new Router();
    setMcpRoute(router, {} as AppLayers, config, buildMcpServer);
    const app = new Koa();
    app.use(router.routes());
    server = http.createServer(app.callback());
    await new Promise<void>((r) => server.listen(0, r));
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api-gateway/mcp`;
  });
  afterAll(() => new Promise((r) => server.close(r)));
  beforeEach(() => {
    buildMcpServer.mockClear();
    (resolveIdentity as jest.Mock).mockResolvedValue({
      userId: "u",
      method: "oauth",
    });
  });

  const post = (origin?: string) =>
    fetch(url, { method: "POST", headers: origin ? { Origin: origin } : {} });

  it.each(["https://evil.example", "null"])(
    "answers 403 for Origin %s before any server is built",
    async (origin) => {
      const res = await post(origin);
      expect(res.status).toBe(403);
      expect(await res.json()).toMatchObject({
        jsonrpc: "2.0",
        id: null,
        error: { code: -32000 },
      });
      expect(buildMcpServer).not.toHaveBeenCalled();
    },
  );

  it.each([undefined, "https://beancount.io", "http://localhost:3000"])(
    "does not refuse Origin %s",
    async (origin) => {
      expect((await post(origin)).status).not.toBe(403);
    },
  );

  it("keeps the 401 discovery hint for an anonymous foreign Origin", async () => {
    (resolveIdentity as jest.Mock).mockResolvedValue(null);
    const res = await post("https://evil.example");
    expect(res.status).toBe(401);
    expect(res.headers.get("www-authenticate")).toContain("resource_metadata");
  });
});
