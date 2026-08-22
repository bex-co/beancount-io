import { openPullRequest } from "../open-pull-request-tool";
import type { GiteaConfig } from "@/config/config";

const gitea: GiteaConfig = {
  hostname: "192.168.4.49",
  internalHostname: "gitea",
  httpPort: 3000,
  externalHttpPort: 3701,
  sshPort: 2223,
} as GiteaConfig;

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
