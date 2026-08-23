import {
  clearMemoizedGiteaClients,
  createGiteaClient,
  createGiteaClientFromAuthHeader,
  createGiteaTokenClient,
} from "@/features/gitea/service/gitea-client-factory";

jest.mock("@/config", () => ({
  config: {
    env: "test",
    port: 8000,
    gitea: {
      hostName: "gitea-test",
      httpPort: 3123,
      baseUrl: "http://gitea-test:3123",
    },
    webhookToken: "",
    backendV2: { hostName: "backend-v2", httpPort: 4104, adminToken: "" },
  },
}));

describe("gitea-client-factory", () => {
  beforeEach(() => {
    clearMemoizedGiteaClients();
    jest.restoreAllMocks();
  });

  it("forwards the Authorization header verbatim and defaults format json", async () => {
    const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ login: "alice" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const client = createGiteaClientFromAuthHeader("token sha1sha1");
    const res = await client.user.userGetCurrent();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(String(url)).toBe("http://gitea-test:3123/api/v1/user");
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "token sha1sha1",
    );
    // format:"json" default → response.data is populated (the branch's
    // hard-won integration fix; without it .data stays null)
    expect(res.data).toEqual({ login: "alice" });
  });

  it("memoizes per credential and separates distinct credentials", () => {
    const a1 = createGiteaClientFromAuthHeader("Basic aaa");
    const a2 = createGiteaClientFromAuthHeader("Basic aaa");
    const b = createGiteaClientFromAuthHeader("Basic bbb");
    expect(a1).toBe(a2);
    expect(a1).not.toBe(b);
  });

  it("basic/token helpers produce the same instances as the header form", () => {
    const viaHelper = createGiteaClient("u", "p");
    const header = `Basic ${Buffer.from("u:p").toString("base64")}`;
    expect(createGiteaClientFromAuthHeader(header)).toBe(viaHelper);
    const tokenClient = createGiteaTokenClient("t1");
    expect(createGiteaClientFromAuthHeader("token t1")).toBe(tokenClient);
  });
});
