// eslint-disable-next-line @typescript-eslint/no-require-imports
const { publicOrigin, exportLines, resolvePublicEnv } = require("../resolve-public-url.js");

// A deployment on a platform that assigns hostnames learns its public address
// from the dashboard at start. Everything here guards the two ways that goes
// wrong: silently using the wrong address, and changing a deployment that
// never asked for any of this.

const FROM = "http://dashboard.internal:3000/_internal/public-url";

function deps(responses: Array<string | Error | { status: number }>) {
  let clock = 0;
  const calls: string[] = [];
  const queue = [...responses];
  return {
    calls,
    deps: {
      fetchImpl: async (url: string) => {
        calls.push(url);
        const next = queue.length > 1 ? queue.shift()! : queue[0];
        if (next instanceof Error) throw next;
        if (typeof next === "object") {
          return { ok: false, status: next.status, text: async () => "" };
        }
        return { ok: true, status: 200, text: async () => next };
      },
      sleep: async (ms: number) => {
        clock += ms;
      },
      now: () => clock,
    },
  };
}

describe("publicOrigin", () => {
  it("keeps the origin only", () => {
    expect(publicOrigin(" https://app.example.com/some/path/?q=1 ")).toBe(
      "https://app.example.com",
    );
  });

  it.each([
    ["http://app.example.com", /https/],
    ["https://user:pw@app.example.com", /credentials/],
    ["not a url", /absolute/],
    ["", /absolute/],
  ])("refuses %p", (value, message) => {
    expect(() => publicOrigin(value)).toThrow(message);
  });
});

describe("exportLines", () => {
  it("derives the issuer, a host-only cookie domain and the allowed origin", () => {
    expect(exportLines("https://app.example.com", {})).toEqual([
      "export DASHBOARD_URL='https://app.example.com'",
      "export AUTH_COOKIE_DOMAIN='app.example.com'",
      "export EXTRA_ALLOWED_ORIGINS='https://app.example.com'",
    ]);
  });

  it("never overrides what the operator set", () => {
    const lines = exportLines("https://app.example.com", {
      AUTH_COOKIE_DOMAIN: ".example.com",
      EXTRA_ALLOWED_ORIGINS: "https://other.example.com",
    });
    expect(lines).toEqual(["export DASHBOARD_URL='https://app.example.com'"]);
  });
});

describe("resolvePublicEnv", () => {
  it("does nothing, and asks nothing, when PUBLIC_URL_FROM is unset", async () => {
    const { deps: d, calls } = deps(["https://app.example.com"]);
    expect(
      await resolvePublicEnv({ DASHBOARD_URL: "https://beancount.io" }, d),
    ).toEqual([]);
    expect(await resolvePublicEnv({}, d)).toEqual([]);
    expect(calls).toEqual([]);
  });

  it("learns the address from the dashboard", async () => {
    const { deps: d, calls } = deps(["https://app-x9.example.com/\n"]);
    const lines = await resolvePublicEnv({ PUBLIC_URL_FROM: FROM }, d);
    expect(calls).toEqual([FROM]);
    expect(lines).toContain("export DASHBOARD_URL='https://app-x9.example.com'");
    expect(lines).toContain("export AUTH_COOKIE_DOMAIN='app-x9.example.com'");
  });

  it("retries while the dashboard is still starting", async () => {
    const { deps: d, calls } = deps([
      new Error("ECONNREFUSED"),
      { status: 503 },
      "https://app.example.com",
    ]);
    const lines = await resolvePublicEnv({ PUBLIC_URL_FROM: FROM }, d);
    expect(calls).toHaveLength(3);
    expect(lines[0]).toBe("export DASHBOARD_URL='https://app.example.com'");
  });

  it("fails rather than start with a wrong address when it cannot learn one", async () => {
    const { deps: d } = deps([new Error("ECONNREFUSED")]);
    await expect(
      resolvePublicEnv({ PUBLIC_URL_FROM: FROM }, d),
    ).rejects.toThrow(/could not learn the public URL/);
  });

  it("refuses a plain-http answer instead of using it", async () => {
    const { deps: d } = deps(["http://app.example.com"]);
    await expect(
      resolvePublicEnv({ PUBLIC_URL_FROM: FROM }, d),
    ).rejects.toThrow(/could not learn the public URL/);
  });

  it("follows an address the operator wrote down, without asking", async () => {
    const { deps: d, calls } = deps(["https://elsewhere.example.com"]);
    const lines = await resolvePublicEnv(
      { PUBLIC_URL_FROM: FROM, DASHBOARD_URL: "https://books.mycorp.com/" },
      d,
    );
    expect(calls).toEqual([]);
    expect(lines).toEqual([
      "export AUTH_COOKIE_DOMAIN='books.mycorp.com'",
      "export EXTRA_ALLOWED_ORIGINS='https://books.mycorp.com'",
    ]);
  });
});
