import { describe, expect, it } from "vitest";
import selfHostSignUp, {
  AUTH_COOKIE,
  judgeCookie,
  makeAccount,
  // @ts-expect-error plain ES module without types, like the other QA scenarios
} from "../qa/self-host-sign-up.mjs";

// The smoke test is only worth running if it can tell a healthy self-hosted
// stack from a broken one, and says "not applicable" for a stack that verifies
// email. A fake page stands in for the browser; each case is one way a
// deployment can go.

const BASE = "https://dash.example.com";

type Mode = "self-host" | "verifies-email" | "limited" | "login-after-reload";

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
    goto: async () => {},
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
    getByRole: () => ({
      click: async () => {
        state.path = "/ledger/smoke/books";
      },
    }),
    waitForURL: async (target: RegExp | ((u: URL) => boolean)) => {
      const url = new URL(state.path, BASE);
      const hit =
        typeof target === "function" ? target(url) : target.test(url.pathname);
      if (!hit) throw new Error("timeout");
    },
    evaluate: async (fn: (arg?: unknown) => unknown) => {
      const source = String(fn);
      state.evaluated.push(
        source.includes("DeleteAccount") ? "delete" : "create",
      );
      if (source.includes("DeleteAccount")) {
        state.deleted = true;
        return true;
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

describe("selfHostSignUp", () => {
  it("passes on a healthy self-hosted stack and deletes its own account", async () => {
    const { page, state } = fakePage("self-host");
    const result = await run(page);
    expect(failed(result)).toEqual([]);
    expect(result.skipped).toBeUndefined();
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
