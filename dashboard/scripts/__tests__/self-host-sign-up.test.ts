import { describe, expect, it } from "vitest";
import selfHostSignUp, {
  AUTH_COOKIE,
  judgeContract,
  judgeCookie,
  judgeOAuth,
  makeAccount,
  // @ts-expect-error plain ES module without types, like the other QA scenarios
} from "../qa/self-host-sign-up.mjs";

// The smoke test is only worth running if it can tell a healthy self-hosted
// stack from a broken one, and says "not applicable" for a stack that verifies
// email. A fake page stands in for the browser; each case is one way a
// deployment can go.

const BASE = "https://dash.example.com";

type Mode =
  | "self-host"
  | "verifies-email"
  | "limited"
  | "login-after-reload"
  | "closed"
  | "no-create-button"
  | "sign-up-still-open"
  | "hosted-clone-address"
  | "clone-address-dead"
  | "proxy-follows-redirect";

function fakePage(mode: Mode, cookie: Record<string, unknown> | null = {}) {
  const state = {
    path: "/auth/sign-up",
    deleted: false,
    evaluated: [] as string[],
  };
  const cookies =
    cookie === null
      ? []
      : [
          {
            name: AUTH_COOKIE,
            domain: ".dash.example.com",
            httpOnly: true,
            secure: true,
            ...cookie,
          },
        ];
  const field = () => ({ fill: async () => {}, waitFor: async () => {} });
  const page = {
    on: () => {},
    url: () => new URL(state.path, BASE).href,
    goto: async () => {
      // A stack that already has an account sends the sign-up page to sign-in.
      if (mode === "closed") state.path = "/auth/login";
    },
    reload: async () => {
      if (mode === "login-after-reload") state.path = "/auth/login";
    },
    context: () => ({ cookies: async () => cookies }),
    locator: (selector: string) => ({
      ...field(),
      click: async () => {
        if (selector === "button[type=submit]") {
          state.path =
            mode === "verifies-email" ? "/auth/sign-up" : "/auth/welcome";
        }
      },
      innerText: async () =>
        mode === "verifies-email" && state.path === "/auth/sign-up"
          ? "Verify your email We've sent a 4-digit code"
          : "Create Your First Ledger",
    }),
    getByPlaceholder: () => field(),
    getByTestId: () => ({
      click: async () => {
        if (mode === "no-create-button") throw new Error("timeout");
        state.path = "/ledger/smoke/books";
      },
    }),
    waitForURL: async (target: RegExp | ((u: URL) => boolean)) => {
      const url = new URL(state.path, BASE);
      const hit =
        typeof target === "function" ? target(url) : target.test(url.pathname);
      if (!hit) throw new Error("timeout");
    },
    request: {
      get: async (url: string) => {
        if (url.includes("/.well-known/")) {
          return {
            json: async () => ({
              issuer: BASE,
              authorization_endpoint: `${BASE}/api-gateway/oauth/auth`,
              token_endpoint: `${BASE}/api-gateway/oauth/token`,
            }),
          };
        }
        if (url.includes("/oauth/auth")) {
          return mode === "proxy-follows-redirect"
            ? { status: () => 200, headers: () => ({}) }
            : {
                status: () => 303,
                headers: () => ({ location: `${BASE}/oauth/mobile-consent` }),
              };
        }
        return { status: () => (mode === "clone-address-dead" ? 404 : 401) };
      },
    },
    evaluate: async (fn: (arg?: unknown) => unknown) => {
      const source = String(fn);
      state.evaluated.push(
        source.includes("DeleteAccount")
          ? "delete"
          : source.includes("SelfHostContract")
            ? "contract"
            : "create",
      );
      if (source.includes("DeleteAccount")) {
        state.deleted = true;
        return true;
      }
      if (source.includes("SelfHostContract")) {
        return {
          deployment: {
            selfHost: true,
            signUpOpen: mode === "sign-up-still-open",
          },
          ledgers: [
            {
              httpUrl:
                mode === "hosted-clone-address"
                  ? "https://git.beancount.io/smoke/books.git"
                  : "https://api.example.com/git/smoke/books.git",
              sshUrl: null,
            },
          ],
        };
      }
      return mode === "limited"
        ? { status: 200, error: "Ledger limit reached" }
        : { status: 200, created: "smoke/books-2" };
    },
  };
  return { page, state };
}

const run = (page: unknown, extra = {}) =>
  selfHostSignUp(page, { baseURL: BASE, timeoutMs: 50, ...extra });
const failed = (r: { checks: { ok: boolean; name: string }[] }) =>
  r.checks.filter((c) => !c.ok).map((c) => c.name);

describe("makeAccount", () => {
  it("is different every time and the password shares nothing with the address", () => {
    const a = makeAccount();
    const b = makeAccount();
    expect(a.email).not.toBe(b.email);
    expect(a.password).not.toBe(b.password);
    expect(a.password).not.toContain(a.username.replace("smoke_", ""));
    expect(a.email.endsWith("@example.com")).toBe(true);
    expect(a.username.length).toBeLessThanOrEqual(20);
  });
});

describe("judgeCookie", () => {
  const good = {
    name: AUTH_COOKIE,
    domain: "dash.example.com",
    httpOnly: true,
    secure: true,
  };

  it("accepts a host cookie that is HttpOnly and Secure", () => {
    expect(judgeCookie([good], BASE).ok).toBe(true);
  });

  it.each([
    ["missing", []],
    ["readable by script", [{ ...good, httpOnly: false }]],
    ["sent over plain http", [{ ...good, secure: false }]],
    ["for another site", [{ ...good, domain: ".beancount.io" }]],
  ])("refuses a cookie that is %s", (_name, cookies) => {
    expect(judgeCookie(cookies, BASE).ok).toBe(false);
  });
});

describe("judgeContract", () => {
  const deployment = { selfHost: true, signUpOpen: false };
  const bad = (input: unknown) =>
    judgeContract(input)
      .filter((c: { ok: boolean }) => !c.ok)
      .map((c: { name: string }) => c.name);

  it("accepts the stack's own HTTPS and SSH addresses", () => {
    const ledgers = [
      {
        httpUrl: "https://git.example.com/a/b.git",
        sshUrl: "git@git.example.com:a/b.git",
      },
    ];
    expect(bad({ deployment, ledgers })).toEqual([]);
  });

  it("refuses an SSH address on the hosted service", () => {
    const ledgers = [
      {
        httpUrl: "https://git.example.com/a/b.git",
        sshUrl: "git@git.beancount.io:a/b.git",
      },
    ];
    expect(bad({ deployment, ledgers })).toEqual([
      "ledger clone addresses name this stack, not beancount.io",
    ]);
  });

  it("does not mistake a look-alike host for the hosted service", () => {
    const ledgers = [
      { httpUrl: "https://notbeancount.io/a/b.git", sshUrl: null },
    ];
    expect(bad({ deployment, ledgers })).toEqual([]);
  });

  it("fails when the stack cannot be asked", () => {
    expect(bad({ error: "Unauthorized" })).toEqual([
      "the stack reports its deployment and ledgers",
    ]);
  });
});

describe("judgeOAuth", () => {
  const metadata = {
    issuer: BASE,
    authorization_endpoint: `${BASE}/api-gateway/oauth/auth`,
    token_endpoint: `${BASE}/api-gateway/oauth/token`,
  };
  const authorize = { status: 303, location: `${BASE}/auth/login` };
  const bad = (input: unknown) =>
    judgeOAuth(input, BASE)
      .filter((c: { ok: boolean }) => !c.ok)
      .map((c: { name: string }) => c.name);

  it("accepts discovery on this host and a redirecting authorization", () => {
    expect(bad({ metadata, authorize })).toEqual([]);
  });

  it("refuses a discovery document that names another host", () => {
    expect(
      bad({
        metadata: { ...metadata, issuer: "https://beancount.io" },
        authorize,
      }),
    ).toEqual(["OAuth discovery names this stack"]);
  });

  it("refuses an authorization endpoint that answers with a page", () => {
    expect(bad({ metadata, authorize: { status: 200 } })).toEqual([
      "the authorization endpoint sends the browser on to sign in",
    ]);
  });

  it("fails when discovery cannot be read", () => {
    expect(bad({ error: "timeout" })).toEqual([
      "OAuth discovery names this stack",
    ]);
  });
});

describe("selfHostSignUp", () => {
  it("passes on a healthy self-hosted stack and deletes its own account", async () => {
    const { page, state } = fakePage("self-host");
    const result = await run(page);
    expect(failed(result)).toEqual([]);
    expect(result.skipped).toBeUndefined();
    expect(state.deleted).toBe(true);
  });

  it("fails, and still deletes its account, when the ledger form cannot be submitted", async () => {
    const { page, state } = fakePage("no-create-button");
    const result = await run(page);
    expect(failed(result)).toContain("a ledger is created");
    expect(state.deleted).toBe(true);
  });

  it.each([
    ["sign-up-still-open", "sign-up is closed behind the first account"],
    [
      "hosted-clone-address",
      "ledger clone addresses name this stack, not beancount.io",
    ],
    [
      "clone-address-dead",
      "the clone address is a Git host that asks for credentials",
    ],
    [
      "proxy-follows-redirect",
      "the authorization endpoint sends the browser on to sign in",
    ],
  ] as const)("fails on a stack with %s", async (mode, check) => {
    const { page, state } = fakePage(mode);
    expect(failed(await run(page))).toEqual([check]);
    expect(state.deleted).toBe(true);
  });

  it("keeps the account when asked", async () => {
    const { page, state } = fakePage("self-host");
    await run(page, { keep: true });
    expect(state.deleted).toBe(false);
  });

  it("skips, and creates nothing, on a stack that verifies email", async () => {
    const { page, state } = fakePage("verifies-email");
    const result = await run(page);
    expect(result.skipped).toMatch(/verifies email/);
    expect(state.evaluated).toEqual([]);
  });

  it("skips, and creates nothing, on a stack that has closed sign-up", async () => {
    const { page, state } = fakePage("closed");
    const result = await run(page);
    expect(result.skipped).toMatch(/no more sign-ups/);
    expect(result.checks).toEqual([]);
    expect(state.evaluated).toEqual([]);
  });

  it("fails, instead of skipping, when the pipeline requires self-hosting", async () => {
    const { page } = fakePage("verifies-email");
    const result = await run(page, { requireSelfHost: true });
    expect(result.skipped).toBeUndefined();
    expect(failed(result)).toContain(
      "signs the visitor in without an email step",
    );
  });

  it("fails when the browser did not keep a sign-in cookie", async () => {
    const { page } = fakePage("self-host", null);
    expect(failed(await run(page))).toContain(
      "the browser keeps the sign-in cookie",
    );
  });

  it("fails when a reload sends the visitor back to the login page", async () => {
    const { page } = fakePage("login-after-reload");
    expect(failed(await run(page))).toContain("a reload keeps the session");
  });

  it("fails when a plan limit still applies", async () => {
    const { page } = fakePage("limited");
    expect(failed(await run(page))).toContain(
      "a second ledger is allowed (no plan limit)",
    );
  });
});
