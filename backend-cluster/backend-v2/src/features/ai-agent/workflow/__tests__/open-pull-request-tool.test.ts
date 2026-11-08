import { openPullRequest } from "../open-pull-request-tool";
import { DEFAULT_EXTERNAL_GITEA_HOST, type GiteaConfig } from "@/config/config";

// No `as GiteaConfig` cast: the cast hid a missing field from tsc, so the
// only signal was a runtime `undefined` in the built URL.
const gitea: GiteaConfig = {
  hostname: "192.168.4.49",
  internalHostname: "gitea",
  httpPort: 3000,
  internalBaseUrl: "http://gitea:3000",
  externalHttpPort: 3701,
  sshPort: 2223,
};

const deps = {
  gitea,
  ledgerOwner: "alice",
  ledgerName: "default",
  ledgerUsername: "un_a",
  ledgerPassword: "pw_a",
};

describe("openPullRequest", () => {
  afterEach(() => jest.restoreAllMocks());

  it("POSTs to the internal Gitea pulls API with basic auth and returns the PR url", async () => {
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ number: 7 }), { status: 201 }),
      );

    const result = await openPullRequest(deps, {
      title: "Add Q3 rent",
      body: "adds a transaction",
      head: "claude/add-rent",
      base: "main",
    });

    expect(result).toEqual({
      ok: true,
      prNumber: 7,
      // external URL uses the IP host + external port over http
      prUrl: "http://192.168.4.49:3701/alice/default/pulls/7",
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://gitea:3000/api/v1/repos/alice/default/pulls");
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers.Authorization).toBe(
      `Basic ${Buffer.from("un_a:pw_a").toString("base64")}`,
    );
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      title: "Add Q3 rent",
      body: "adds a transaction",
      head: "claude/add-rent",
      base: "main",
    });
  });

  it("returns ok:false with the error body on a non-2xx response", async () => {
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue(
        new Response("head branch does not exist", { status: 422 }),
      );

    const result = await openPullRequest(deps, {
      title: "t",
      body: "",
      head: "missing",
      base: "main",
    });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("422");
  });

  it("returns ok:false when fetch throws", async () => {
    jest.spyOn(global, "fetch").mockRejectedValue(new Error("ECONNREFUSED"));
    const result = await openPullRequest(deps, {
      title: "t",
      body: "",
      head: "b",
      base: "main",
    });
    expect(result).toEqual({ ok: false, error: "ECONNREFUSED" });
  });
});

// The external host defaults to beancount.io's own Git host, which is right for
// the managed service and wrong for everybody else. A self-hosted stack that
// configured none must never be handed a link to it.
describe("openPullRequest link on a self-hosted stack", () => {
  afterEach(() => jest.restoreAllMocks());

  const unconfigured: GiteaConfig = {
    ...gitea,
    hostname: DEFAULT_EXTERNAL_GITEA_HOST,
    externalHttpPort: 443,
  };
  const input = { title: "t", body: "", head: "b", base: "main" };
  const reply = (body: unknown) =>
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue(new Response(JSON.stringify(body), { status: 201 }));

  it("uses the address Gitea itself returned", async () => {
    reply({
      number: 3,
      html_url: "https://git-x9.example.com/alice/default/pulls/3",
    });
    const result = await openPullRequest(
      { ...deps, gitea: unconfigured, selfHost: true },
      input,
    );
    expect(result.prUrl).toBe(
      "https://git-x9.example.com/alice/default/pulls/3",
    );
  });

  it("leaves the link out, rather than naming beancount.io, when Gitea gave none", async () => {
    reply({ number: 3 });
    const result = await openPullRequest(
      { ...deps, gitea: unconfigured, selfHost: true },
      input,
    );
    expect(result).toEqual({ ok: true, prNumber: 3 });
  });

  it.each(["javascript:alert(1)", "//evil.example/x", "", 7, null])(
    "does not trust an address that is not an http(s) URL (%p)",
    async (htmlUrl) => {
      reply({ number: 3, html_url: htmlUrl });
      const result = await openPullRequest(
        { ...deps, gitea: unconfigured, selfHost: true },
        input,
      );
      expect(result.prUrl).toBeUndefined();
    },
  );

  it("still honours a host the operator configured", async () => {
    reply({ number: 3, html_url: "https://elsewhere.example.com/x" });
    const configured: GiteaConfig = {
      ...gitea,
      hostname: "git.mycorp.test",
      externalHttpPort: 443,
    };
    const result = await openPullRequest(
      { ...deps, gitea: configured, selfHost: true },
      input,
    );
    expect(result.prUrl).toBe("https://git.mycorp.test/alice/default/pulls/3");
  });

  it("does not change the managed service, even when Gitea returns an address", async () => {
    reply({ number: 3, html_url: "http://gitea:3000/alice/default/pulls/3" });
    const result = await openPullRequest(
      { ...deps, gitea: unconfigured, selfHost: false },
      input,
    );
    expect(result.prUrl).toBe("https://git.beancount.io/alice/default/pulls/3");
  });

  it("reads the SELF_HOST switch from the environment by default", async () => {
    const saved = process.env.SELF_HOST;
    try {
      reply({ number: 3 });
      process.env.SELF_HOST = "true";
      expect(
        (await openPullRequest({ ...deps, gitea: unconfigured }, input)).prUrl,
      ).toBeUndefined();
      delete process.env.SELF_HOST;
      reply({ number: 3 });
      expect(
        (await openPullRequest({ ...deps, gitea: unconfigured }, input)).prUrl,
      ).toBe("https://git.beancount.io/alice/default/pulls/3");
    } finally {
      if (saved === undefined) delete process.env.SELF_HOST;
      else process.env.SELF_HOST = saved;
    }
  });
});
