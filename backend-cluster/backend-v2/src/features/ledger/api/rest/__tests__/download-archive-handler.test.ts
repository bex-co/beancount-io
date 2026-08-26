const fetchMock = jest.fn();
jest.mock("node-fetch", () => ({
  __esModule: true,
  default: (...args: unknown[]) => fetchMock(...args),
}));

import http from "node:http";
import Koa from "koa";
import Router from "@koa/router";
import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import { restErrorMiddleware } from "@/server/rest/error-middleware";
import { registerDownloadArchiveRoute } from "../download-archive-handler";

/**
 * The legacy archive download over HTTP.
 *
 * The one property these tests exist to hold: a credential in the query string
 * is not a credential on this route. It once was — `?token=<JWT>` carried the
 * caller's whole session in every URL — and the regression these tests pin is
 * that a private ledger refuses such a request before any upstream fetch.
 */
const mockGetLedger = jest.fn();

const layers = {
  database: {
    db: undefined,
    models: { user: { getById: jest.fn() } },
  },
  clients: {
    favaClientFactory: {
      getAdminClient: () => ({ ledgers: { getLedger: mockGetLedger } }),
    },
  },
} as unknown as AppLayers;

const config = {
  favaApi: { baseUrl: "http://ledger.invalid/" },
} as unknown as AppConfig;

let baseUrl: string;
let server: http.Server;

beforeAll(async () => {
  const router = new Router();
  router.use(restErrorMiddleware());
  registerDownloadArchiveRoute(router, layers, config);
  const app = new Koa();
  app.silent = true;
  app.use(router.routes()).use(router.allowedMethods());
  server = http.createServer(app.callback());
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (typeof address !== "object" || !address) throw new Error("no port");
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(() => {
  server.close();
});

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({
    ok: true,
    status: 200,
    headers: { get: () => null },
    body: "ZIPBYTES",
  });
});

describe("legacy archive download", () => {
  it("refuses a private ledger when the only credential is a JWT in the query string", async () => {
    mockGetLedger.mockResolvedValue({
      data: { success: true, data: { private: true } },
    });

    const response = await fetch(
      `${baseUrl}/api-gateway/ledgers/alice%2Fpersonal/archive/main.zip?token=a.jwt.value`,
    );

    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("streams a public ledger's archive to an anonymous caller with no credential", async () => {
    mockGetLedger.mockResolvedValue({
      data: { success: true, data: { private: false } },
    });

    const response = await fetch(
      `${baseUrl}/api-gateway/ledgers/alice%2Fpublic/archive/main.zip`,
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("ZIPBYTES");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://ledger.invalid/ledgers/alice/public/archive/main.zip",
      {
        method: "GET",
        headers: { Authorization: "Anonymous" },
      },
    );
  });

  it("reports an unknown ledger as 404 without an upstream request", async () => {
    mockGetLedger.mockResolvedValue({ data: { success: false } });

    const response = await fetch(
      `${baseUrl}/api-gateway/ledgers/nobody%2Fmain/archive/main.zip`,
    );

    expect(response.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("still rejects a traversal archive name before anything downstream", async () => {
    const response = await fetch(
      `${baseUrl}/api-gateway/ledgers/alice%2Fpublic/archive/..%2F..%2Fjournal`,
    );

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
