import Router from "@koa/router";
import { Readable } from "node:stream";
import type { AppLayers } from "@/foundation/composition";
import { AppConfig } from "@/config/config";

// Mock logger to avoid winston-loki dependency issues
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

// Mock node-fetch - declare function before jest.mock hoisting
const mockFetch = jest.fn();
jest.mock("node-fetch", () => mockFetch);

// Import after mocking
import { setGitProxyHandler } from "../git-proxy-handler";
import { clearRateLimitStores } from "@/shared/rate-limiter";

describe("setGitProxyHandler", () => {
  let router: Router;
  let mockServices: Pick<AppLayers, "database" | "services" | "clients">;
  let mockConfig: AppConfig;
  let registeredRoute: {
    method: string;
    path: string;
    middleware: (
      ctx: Router.RouterContext,
      next: () => Promise<void>,
    ) => Promise<void>;
    handler: (ctx: Router.RouterContext) => Promise<void>;
  } | null = null;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    registeredRoute = null;
    // Clear rate limit stores between tests
    clearRateLimitStores();

    // Create a mock router that captures the registered route (with middleware)
    router = {
      all: jest.fn(
        (
          path: string,
          middleware: (
            ctx: Router.RouterContext,
            next: () => Promise<void>,
          ) => Promise<void>,
          handler: (ctx: Router.RouterContext) => Promise<void>,
        ) => {
          registeredRoute = { method: "all", path, middleware, handler };
        },
      ),
    } as unknown as Router;

    // Create mock services
    mockServices = {
      database: {
        db: {} as any,
        models: {
          user: {
            getByMail: jest.fn(),
            verifyPassword: jest.fn(),
            // The shadow directive-limit check looks the repo owner up on every
            // receive-pack. No user here, so it fails open — which is what these
            // transport tests want asserted: no verdict may change whether a
            // push is forwarded.
            getUserByUsername: jest.fn().mockResolvedValue(null),
          },
        } as any,
      },
      services: { stripe: {} } as any,
      clients: { cacheHelper: {} } as any,
    };

    // Create mock config
    mockConfig = {
      gitea: {
        internalHostname: "gitea",
        httpPort: 3000,
        internalBaseUrl: "http://gitea:3000",
        hostname: "git.example.com",
        externalHttpPort: 443,
        sshPort: 2222,
      },
    } as unknown as AppConfig;
  });

  it("should register a route for /git{/*path} with rate limiter middleware", () => {
    setGitProxyHandler(router, mockServices, mockConfig);

    expect(router.all).toHaveBeenCalledWith(
      "/git{/*path}",
      expect.any(Function), // rate limiter middleware
      expect.any(Function), // handler
    );
  });

  describe("request handling", () => {
    let ctx: Router.RouterContext;
    let mockUser: {
      id: string;
      ledger_username: string;
      ledger_password: string;
    };

    beforeEach(() => {
      mockUser = {
        id: "user-123",
        ledger_username: "gitea-user",
        ledger_password: "gitea-pass",
      };

      ctx = {
        params: { path: "owner/repo.git/info/refs" },
        method: "GET",
        get: jest.fn(),
        set: jest.fn(),
        headers: {},
        req: {},
        status: 0,
        body: null,
      } as unknown as Router.RouterContext;
    });

    it("should return 401 with WWW-Authenticate header when no auth header", async () => {
      setGitProxyHandler(router, mockServices, mockConfig);
      (ctx.get as jest.Mock).mockReturnValue(undefined);

      await registeredRoute!.handler(ctx);

      expect(ctx.status).toBe(401);
      expect(ctx.set).toHaveBeenCalledWith(
        "WWW-Authenticate",
        'Basic realm="Git"',
      );
      expect(ctx.body).toBe("Authentication required");
    });

    it("should return 401 when user not found", async () => {
      setGitProxyHandler(router, mockServices, mockConfig);

      const basicAuth = Buffer.from("test@example.com:password123").toString(
        "base64",
      );
      (ctx.get as jest.Mock).mockReturnValue(`Basic ${basicAuth}`);
      (
        mockServices.database.models.user.getByMail as jest.Mock
      ).mockResolvedValue(null);

      await registeredRoute!.handler(ctx);

      expect(ctx.status).toBe(401);
      expect(mockServices.database.models.user.getByMail).toHaveBeenCalledWith(
        mockServices.database.db,
        "test@example.com",
      );
    });

    it("should return 401 when password is invalid", async () => {
      setGitProxyHandler(router, mockServices, mockConfig);

      const basicAuth = Buffer.from("test@example.com:wrongpassword").toString(
        "base64",
      );
      (ctx.get as jest.Mock).mockReturnValue(`Basic ${basicAuth}`);
      (
        mockServices.database.models.user.getByMail as jest.Mock
      ).mockResolvedValue(mockUser);
      (
        mockServices.database.models.user.verifyPassword as jest.Mock
      ).mockResolvedValue(false);

      await registeredRoute!.handler(ctx);

      expect(ctx.status).toBe(401);
      expect(
        mockServices.database.models.user.verifyPassword,
      ).toHaveBeenCalledWith(
        mockServices.database.db,
        mockUser.id,
        "wrongpassword",
      );
    });

    it("should proxy request with translated credentials on successful auth", async () => {
      setGitProxyHandler(router, mockServices, mockConfig);

      const basicAuth = Buffer.from("test@example.com:password123").toString(
        "base64",
      );
      (ctx.get as jest.Mock).mockReturnValue(`Basic ${basicAuth}`);
      (
        mockServices.database.models.user.getByMail as jest.Mock
      ).mockResolvedValue(mockUser);
      (
        mockServices.database.models.user.verifyPassword as jest.Mock
      ).mockResolvedValue(true);

      // Mock fetch response
      const mockHeaders = new Map<string, string>([
        ["content-type", "application/x-git-upload-pack-advertisement"],
      ]);
      mockFetch.mockResolvedValue({
        status: 200,
        headers: {
          forEach: (cb: (value: string, key: string) => void) =>
            mockHeaders.forEach(cb),
        },
        body: "mock-response-body",
      });

      await registeredRoute!.handler(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body).toBe("mock-response-body");

      // Verify fetch was called with translated credentials
      const expectedLedgerAuth = Buffer.from("gitea-user:gitea-pass").toString(
        "base64",
      );
      expect(mockFetch).toHaveBeenCalledWith(
        "http://gitea:3000/owner/repo.git/info/refs",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            Authorization: `Basic ${expectedLedgerAuth}`,
          }),
        }),
      );
    });

    it("should handle passwords containing colons", async () => {
      setGitProxyHandler(router, mockServices, mockConfig);

      // Password contains colons
      const basicAuth = Buffer.from("test@example.com:pass:word:123").toString(
        "base64",
      );
      (ctx.get as jest.Mock).mockReturnValue(`Basic ${basicAuth}`);
      (
        mockServices.database.models.user.getByMail as jest.Mock
      ).mockResolvedValue(mockUser);
      (
        mockServices.database.models.user.verifyPassword as jest.Mock
      ).mockResolvedValue(true);

      mockFetch.mockResolvedValue({
        status: 200,
        headers: { forEach: jest.fn() },
        body: "mock-response-body",
      });

      await registeredRoute!.handler(ctx);

      // Should have called verifyPassword with the full password including colons
      expect(
        mockServices.database.models.user.verifyPassword,
      ).toHaveBeenCalledWith(
        mockServices.database.db,
        mockUser.id,
        "pass:word:123",
      );
    });

    it("should return 502 on fetch error", async () => {
      setGitProxyHandler(router, mockServices, mockConfig);

      const basicAuth = Buffer.from("test@example.com:password123").toString(
        "base64",
      );
      (ctx.get as jest.Mock).mockReturnValue(`Basic ${basicAuth}`);
      (
        mockServices.database.models.user.getByMail as jest.Mock
      ).mockResolvedValue(mockUser);
      (
        mockServices.database.models.user.verifyPassword as jest.Mock
      ).mockResolvedValue(true);

      mockFetch.mockRejectedValue(new Error("Connection refused"));

      await registeredRoute!.handler(ctx);

      expect(ctx.status).toBe(502);
      expect(ctx.body).toBe("Bad Gateway");
    });

    it("should forward error status codes from Gitea", async () => {
      setGitProxyHandler(router, mockServices, mockConfig);

      const basicAuth = Buffer.from("test@example.com:password123").toString(
        "base64",
      );
      (ctx.get as jest.Mock).mockReturnValue(`Basic ${basicAuth}`);
      (
        mockServices.database.models.user.getByMail as jest.Mock
      ).mockResolvedValue(mockUser);
      (
        mockServices.database.models.user.verifyPassword as jest.Mock
      ).mockResolvedValue(true);

      mockFetch.mockResolvedValue({
        status: 404,
        headers: { forEach: jest.fn() },
        body: "Not Found",
      });

      await registeredRoute!.handler(ctx);

      expect(ctx.status).toBe(404);
    });

    describe("Gitea username/password auth", () => {
      it("should pass Gitea credentials directly through when username has no @", async () => {
        setGitProxyHandler(router, mockServices, mockConfig);

        const basicAuth = Buffer.from("gitea-user:gitea-pass").toString(
          "base64",
        );
        const authHeaderValue = `Basic ${basicAuth}`;
        (ctx.get as jest.Mock).mockReturnValue(authHeaderValue);

        const mockHeaders = new Map<string, string>([
          ["content-type", "application/x-git-upload-pack-advertisement"],
        ]);
        mockFetch.mockResolvedValue({
          status: 200,
          headers: {
            forEach: (cb: (value: string, key: string) => void) =>
              mockHeaders.forEach(cb),
          },
          body: "mock-response-body",
        });

        await registeredRoute!.handler(ctx);

        expect(ctx.status).toBe(200);
        expect(ctx.body).toBe("mock-response-body");

        // Should NOT look up user by email or verify password
        expect(
          mockServices.database.models.user.getByMail,
        ).not.toHaveBeenCalled();
        expect(
          mockServices.database.models.user.verifyPassword,
        ).not.toHaveBeenCalled();

        // Should pass the original auth header directly to Gitea
        expect(mockFetch).toHaveBeenCalledWith(
          "http://gitea:3000/owner/repo.git/info/refs",
          expect.objectContaining({
            method: "GET",
            headers: expect.objectContaining({
              Authorization: authHeaderValue,
            }),
          }),
        );
      });

      it("should return 502 on fetch error with Gitea credentials", async () => {
        setGitProxyHandler(router, mockServices, mockConfig);

        const basicAuth = Buffer.from("gitea-user:gitea-pass").toString(
          "base64",
        );
        (ctx.get as jest.Mock).mockReturnValue(`Basic ${basicAuth}`);

        mockFetch.mockRejectedValue(new Error("Connection refused"));

        await registeredRoute!.handler(ctx);

        expect(ctx.status).toBe(502);
        expect(ctx.body).toBe("Bad Gateway");
      });

      it("should forward Gitea 401 when Gitea credentials are invalid", async () => {
        setGitProxyHandler(router, mockServices, mockConfig);

        const basicAuth = Buffer.from("gitea-user:wrong-pass").toString(
          "base64",
        );
        (ctx.get as jest.Mock).mockReturnValue(`Basic ${basicAuth}`);

        mockFetch.mockResolvedValue({
          status: 401,
          headers: { forEach: jest.fn() },
          body: "Unauthorized",
        });

        await registeredRoute!.handler(ctx);

        expect(ctx.status).toBe(401);
        expect(
          mockServices.database.models.user.getByMail,
        ).not.toHaveBeenCalled();
      });
    });
  });

  describe("rate limiting", () => {
    let ctx: Router.RouterContext;

    beforeEach(() => {
      ctx = {
        params: { path: "owner/repo.git/info/refs" },
        method: "GET",
        ip: "192.168.1.100",
        get: jest.fn(),
        set: jest.fn(),
        headers: {},
        req: {},
        status: 0,
        body: null,
      } as unknown as Router.RouterContext;
    });

    it("should apply general rate limiter middleware that allows requests under limit", async () => {
      setGitProxyHandler(router, mockServices, mockConfig);

      const middleware = registeredRoute!.middleware;
      let nextCalled = false;

      await middleware(ctx, async () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(true);
    });

    it("should block requests exceeding 60 per minute via general rate limiter", async () => {
      setGitProxyHandler(router, mockServices, mockConfig);

      const middleware = registeredRoute!.middleware;

      // Exhaust the 60-request limit
      for (let i = 0; i < 60; i++) {
        await middleware(ctx, async () => {});
      }

      // 61st request should be blocked
      await middleware(ctx, async () => {});

      expect(ctx.status).toBe(429);
      expect((ctx.body as { error: { code: string } }).error.code).toBe(
        "RATE_LIMITED",
      );
    });

    it("should return 429 after 5 failed auth attempts (user not found)", async () => {
      setGitProxyHandler(router, mockServices, mockConfig);

      const basicAuth = Buffer.from("bad@example.com:wrongpass").toString(
        "base64",
      );
      (ctx.get as jest.Mock).mockReturnValue(`Basic ${basicAuth}`);
      (
        mockServices.database.models.user.getByMail as jest.Mock
      ).mockResolvedValue(null);

      // First 5 attempts should return 401
      for (let i = 0; i < 5; i++) {
        ctx.status = 0;
        ctx.body = null;
        await registeredRoute!.handler(ctx);
        expect(ctx.status).toBe(401);
      }

      // 6th attempt should be rate limited (429)
      ctx.status = 0;
      ctx.body = null;
      await registeredRoute!.handler(ctx);
      expect(ctx.status).toBe(429);
      expect(ctx.body).toBe(
        "Too many failed authentication attempts, please try again later.",
      );
    });

    it("should return 429 after 5 failed auth attempts (wrong password)", async () => {
      setGitProxyHandler(router, mockServices, mockConfig);

      const basicAuth = Buffer.from("test@example.com:wrongpass").toString(
        "base64",
      );
      (ctx.get as jest.Mock).mockReturnValue(`Basic ${basicAuth}`);
      (
        mockServices.database.models.user.getByMail as jest.Mock
      ).mockResolvedValue({
        id: "user-123",
        ledger_username: "gitea-user",
        ledger_password: "gitea-pass",
      });
      (
        mockServices.database.models.user.verifyPassword as jest.Mock
      ).mockResolvedValue(false);

      // First 5 attempts should return 401
      for (let i = 0; i < 5; i++) {
        ctx.status = 0;
        ctx.body = null;
        await registeredRoute!.handler(ctx);
        expect(ctx.status).toBe(401);
      }

      // 6th attempt should be rate limited (429)
      ctx.status = 0;
      ctx.body = null;
      await registeredRoute!.handler(ctx);
      expect(ctx.status).toBe(429);
    });

    it("should track auth failures per IP independently", async () => {
      setGitProxyHandler(router, mockServices, mockConfig);

      const basicAuth = Buffer.from("bad@example.com:wrongpass").toString(
        "base64",
      );
      (ctx.get as jest.Mock).mockReturnValue(`Basic ${basicAuth}`);
      (
        mockServices.database.models.user.getByMail as jest.Mock
      ).mockResolvedValue(null);

      // 5 failures from IP A
      for (let i = 0; i < 5; i++) {
        ctx.status = 0;
        await registeredRoute!.handler(ctx);
        expect(ctx.status).toBe(401);
      }

      // Switch to a different IP — should still get 401 (not 429)
      const ctx2 = {
        ...ctx,
        ip: "10.0.0.1",
        status: 0,
        body: null,
        get: ctx.get,
        set: jest.fn(),
      } as unknown as Router.RouterContext;

      await registeredRoute!.handler(ctx2);
      expect(ctx2.status).toBe(401);
    });
  });
  // The route was a catch-all forwarding ANY path to Gitea with the caller's
  // translated credentials, which made it a general authenticated Gitea REST
  // API proxy: `/git/api/v1/user` returned the caller's profile and
  // `DELETE /git/api/v1/repos/{o}/{r}/branch_protections/{name}` removed the
  // rule (verified against a live 1.24.7 stack). Policy stored as Gitea
  // repository state is only enforceable while these stay unreachable.
  describe("smart-HTTP path allowlist", () => {
    const authHeader =
      "Basic " + Buffer.from("gitea-user:pw").toString("base64");

    // A receive-pack request now has its command list read before forwarding,
    // so those fixtures need a real stream carrying a valid main-only push.
    function mainOnlyPushBody(): Readable {
      const line = "old new refs/heads/main\0report-status\n";
      const pkt = (line.length + 4).toString(16).padStart(4, "0") + line;
      return Readable.from([Buffer.from(pkt + "0000PACKDATA")]);
    }

    function contextFor(method: string, path: string): Router.RouterContext {
      return {
        params: { path },
        method,
        // Per-header, not a blanket value: the handler also reads
        // Content-Encoding, and answering that with the auth string would make
        // every push look like a compressed body.
        get: jest.fn((name: string) =>
          name.toLowerCase() === "authorization" ? authHeader : "",
        ),
        set: jest.fn(),
        headers: {},
        req: path.endsWith("git-receive-pack") ? mainOnlyPushBody() : {},
        ip: "127.0.0.1",
        status: 0,
        body: null,
      } as unknown as Router.RouterContext;
    }

    beforeEach(() => {
      setGitProxyHandler(router, mockServices, mockConfig);
      mockFetch.mockResolvedValue({
        status: 200,
        headers: { forEach: jest.fn() },
        body: "ok",
      });
    });

    it.each([
      ["GET", "owner/repo.git/info/refs"],
      ["GET", "owner/repo/info/refs"],
      ["POST", "owner/repo.git/git-upload-pack"],
      ["POST", "owner/repo.git/git-receive-pack"],
      ["POST", "owner/repo/git-receive-pack"],
    ])("forwards %s /%s", async (method, path) => {
      const ctx = contextFor(method, path);
      await registeredRoute!.handler(ctx);
      expect(mockFetch).toHaveBeenCalled();
      expect(ctx.status).not.toBe(404);
    });

    it.each([
      ["GET", "api/v1/user"],
      ["GET", "api/v1/repos/owner/repo/branch_protections"],
      ["DELETE", "api/v1/repos/owner/repo/branch_protections/main"],
      ["POST", "api/v1/repos/owner/repo/hooks"],
      ["PATCH", "api/v1/repos/owner/repo"],
      ["GET", "owner/repo.git/objects/ab/cdef0123456789"],
      ["GET", "owner/repo.git/HEAD"],
      ["GET", "owner/repo/settings"],
      ["GET", ""],
    ])(
      "rejects %s /%s with 404 and never calls Gitea",
      async (method, path) => {
        const ctx = contextFor(method, path);
        await registeredRoute!.handler(ctx);
        expect(ctx.status).toBe(404);
        expect(mockFetch).not.toHaveBeenCalled();
      },
    );

    it("rejects a path that tries to escape the repository", async () => {
      const ctx = contextFor("GET", "owner/../../api/v1/user");
      await registeredRoute!.handler(ctx);
      expect(ctx.status).toBe(404);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("enforces the method for each allowed path", async () => {
      // info/refs is a GET; the pack services are POSTs. Crossing them over
      // must not be forwarded.
      const wrongVerbs: Array<[string, string]> = [
        ["POST", "owner/repo.git/info/refs"],
        ["GET", "owner/repo.git/git-receive-pack"],
        ["DELETE", "owner/repo.git/git-upload-pack"],
      ];
      for (const [method, path] of wrongVerbs) {
        mockFetch.mockClear();
        const ctx = contextFor(method, path);
        await registeredRoute!.handler(ctx);
        expect(ctx.status).toBe(404);
        expect(mockFetch).not.toHaveBeenCalled();
      }
    });

    it("rejects before authenticating, so a bad path never reaches credential translation", async () => {
      const ctx = contextFor("GET", "api/v1/user");
      (ctx.get as jest.Mock).mockReturnValue(undefined);

      await registeredRoute!.handler(ctx);

      // 404 rather than 401: the path is rejected before auth is considered.
      expect(ctx.status).toBe(404);
      expect(
        mockServices.database.models.user.getByMail,
      ).not.toHaveBeenCalled();
    });
  });

  // Replaces restrict-to-main-branch.sh for the HTTP path, with no per-repo
  // state: the ref names sit in plain pkt-lines at the head of the
  // git-receive-pack body, before the PACK data.
  describe("main-only ref policy", () => {
    const {
      parseReceivePackRefs,
      disallowedRefs,
      buildRejectionReport,
      pktLine: pkt,
    } = jest.requireActual("../git-proxy-handler");

    it("reads a single ref update", () => {
      const body = Buffer.from(
        pkt("old new refs/heads/main\0report-status side-band-64k\n") +
          "0000PACK",
      );
      const { refs, complete } = parseReceivePackRefs(body);
      expect(complete).toBe(true);
      expect(refs).toEqual([
        { oldSha: "old", newSha: "new", ref: "refs/heads/main" },
      ]);
    });

    it("reads several ref updates", () => {
      const body = Buffer.from(
        pkt("a b refs/heads/main\0caps\n") +
          pkt("c d refs/heads/feature\n") +
          pkt("e f refs/tags/v1\n") +
          "0000PACK",
      );
      const { refs, complete } = parseReceivePackRefs(body);
      expect(complete).toBe(true);
      expect(refs.map((r: { ref: string }) => r.ref)).toEqual([
        "refs/heads/main",
        "refs/heads/feature",
        "refs/tags/v1",
      ]);
    });

    it("reports incomplete when the flush packet has not arrived", () => {
      const full = pkt("a b refs/heads/main\0caps\n") + "0000";
      const { complete } = parseReceivePackRefs(
        Buffer.from(full.slice(0, full.length - 6)),
      );
      expect(complete).toBe(false);
    });

    it("allows main and rejects everything else", () => {
      expect(
        disallowedRefs([{ oldSha: "a", newSha: "b", ref: "refs/heads/main" }]),
      ).toEqual([]);
      expect(
        disallowedRefs([
          { oldSha: "a", newSha: "b", ref: "refs/heads/main" },
          { oldSha: "c", newSha: "d", ref: "refs/heads/dump" },
          { oldSha: "e", newSha: "f", ref: "refs/tags/v1" },
        ]),
      ).toEqual(["refs/heads/dump", "refs/tags/v1"]);
    });

    it("allows deleting main, matching the hook it replaces", () => {
      // restrict-to-main-branch.sh strips refs/heads/ and compares to `main`,
      // so a deletion of main passed through. Keep that behaviour identical.
      expect(
        disallowedRefs([
          { oldSha: "abc", newSha: "0".repeat(40), ref: "refs/heads/main" },
        ]),
      ).toEqual([]);
    });

    it("rejects deleting a non-main branch", () => {
      expect(
        disallowedRefs([
          { oldSha: "abc", newSha: "0".repeat(40), ref: "refs/heads/old" },
        ]),
      ).toEqual(["refs/heads/old"]);
    });

    it("captures the capabilities from the first command line", () => {
      const body = Buffer.from(
        pkt(
          "a b refs/heads/main\0report-status side-band-64k agent=git/2.4\n",
        ) + "0000",
      );
      const { capabilities } = parseReceivePackRefs(body);
      expect(capabilities).toEqual([
        "report-status",
        "side-band-64k",
        "agent=git/2.4",
      ]);
    });

    it("reports each rejected ref so git prints a reason rather than 'RPC failed'", () => {
      const report = buildRejectionReport(["refs/heads/dump"], []).toString();
      expect(report).toContain("unpack ok");
      expect(report).toContain(
        "ng refs/heads/dump only refs/heads/main may be pushed",
      );
      expect(report.endsWith("0000")).toBe(true);
      // pkt-line framing: the first four bytes are the length of "unpack ok\n" + 4
      expect(report.slice(0, 4)).toBe("000e");
    });

    it("frames the report on band 1 when the client asked for side-band", () => {
      const framed = buildRejectionReport(["refs/heads/x"], ["side-band-64k"]);
      // 4 length bytes, then the band indicator.
      expect(framed[4]).toBe(1);
      const plain = buildRejectionReport(["refs/heads/x"], []);
      expect(plain[4]).not.toBe(1);
    });
  });

  // The helpers were unit-tested but the decision was not: reaching it needs
  // the whole handler, which is exactly where the fail-open/fail-closed choice
  // lives.
  describe("main-only enforcement through the handler", () => {
    const authHeader =
      "Basic " + Buffer.from("gitea-user:pw").toString("base64");

    function pushContext(
      refs: string[],
      headers: Record<string, string> = {},
    ): Router.RouterContext {
      const first = `old new ${refs[0]}\0report-status side-band-64k\n`;
      let body = (first.length + 4).toString(16).padStart(4, "0") + first;
      for (const ref of refs.slice(1)) {
        const line = `old new ${ref}\n`;
        body += (line.length + 4).toString(16).padStart(4, "0") + line;
      }
      body += "0000PACKDATA";
      return {
        params: { path: "owner/repo.git/git-receive-pack" },
        method: "POST",
        get: jest.fn((name: string) =>
          name.toLowerCase() === "authorization"
            ? authHeader
            : (headers[name.toLowerCase()] ?? ""),
        ),
        set: jest.fn(),
        headers: {},
        req: Readable.from([Buffer.from(body)]),
        ip: "127.0.0.1",
        status: 0,
        body: null,
      } as unknown as Router.RouterContext;
    }

    beforeEach(() => {
      setGitProxyHandler(router, mockServices, mockConfig);
      mockFetch.mockResolvedValue({
        status: 200,
        headers: { forEach: jest.fn() },
        body: "ok",
      });
    });

    it("forwards a push that only updates main", async () => {
      const ctx = pushContext(["refs/heads/main"]);
      await registeredRoute!.handler(ctx);
      expect(mockFetch).toHaveBeenCalled();
    });

    it("answers a non-main push with a protocol rejection, not a bare status", async () => {
      const ctx = pushContext(["refs/heads/dump"]);
      await registeredRoute!.handler(ctx);

      expect(mockFetch).not.toHaveBeenCalled();
      expect(ctx.status).toBe(200);
      expect(ctx.set).toHaveBeenCalledWith(
        "Content-Type",
        "application/x-git-receive-pack-result",
      );
      expect((ctx.body as Buffer).toString()).toContain("ng refs/heads/dump");
    });

    it("rejects the whole push when any ref is disallowed", async () => {
      const ctx = pushContext(["refs/heads/main", "refs/tags/v1"]);
      await registeredRoute!.handler(ctx);

      expect(mockFetch).not.toHaveBeenCalled();
      expect((ctx.body as Buffer).toString()).toContain("ng refs/tags/v1");
    });

    it("rejects rather than skips when the body claims to be compressed", async () => {
      // Content-Encoding is client-controlled. Skipping the check on it would
      // let any client disable the policy by claiming a compressed body.
      const ctx = pushContext(["refs/heads/dump"], {
        "content-encoding": "gzip",
      });
      await registeredRoute!.handler(ctx);

      expect(mockFetch).not.toHaveBeenCalled();
      expect(ctx.status).toBe(400);
    });

    it("rejects a body whose command list never terminates", async () => {
      const ctx = pushContext(["refs/heads/main"]);
      // Replace the body with a truncated command list (no flush packet).
      (ctx as unknown as { req: Readable }).req = Readable.from([
        Buffer.from("0032old new refs/heads/main"),
      ]);
      await registeredRoute!.handler(ctx);

      expect(mockFetch).not.toHaveBeenCalled();
      expect(ctx.status).toBe(400);
    });
  });
});
