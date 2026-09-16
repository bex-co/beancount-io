import { loadConfig } from "@/config";

describe("loadConfig", () => {
  it("defaults mirror the Python service Settings", () => {
    const cfg = loadConfig({} as NodeJS.ProcessEnv);
    expect(cfg.port).toBe(8000);
    expect(cfg.gitea).toEqual({
      hostName: "beancount-gitea",
      httpPort: 3000,
      baseUrl: "http://beancount-gitea:3000",
    });
    expect(cfg.backendV2).toEqual({
      hostName: "backend-v2",
      httpPort: 4104,
      adminToken: "",
    });
    expect(cfg.loki).toBeUndefined();
    expect(cfg.managedPrices).toEqual({
      origins: ["https://beancount.io"],
      refreshMs: 300_000,
      retryMs: 60_000,
      staleMs: 600_000,
      fetchTimeoutMs: 5000,
      maxBodyBytes: 1_048_576,
      maxFeedsPerLedger: 16,
    });
  });

  it("reads managed price overrides and lets an empty origin list disable the feature", () => {
    const cfg = loadConfig({
      MANAGED_PRICE_ORIGINS: " http://localhost:14000/ , https://beancount.io:443/x,ftp://no,junk",
      MANAGED_PRICE_REFRESH_SECONDS: "30",
      MANAGED_PRICE_RETRY_SECONDS: "5",
      MANAGED_PRICE_STALE_SECONDS: "0",
      MANAGED_PRICE_FETCH_TIMEOUT_MS: "abc",
      MANAGED_PRICE_MAX_BODY_BYTES: "4096",
      MANAGED_PRICE_MAX_FEEDS: "2",
    } as NodeJS.ProcessEnv);
    expect(cfg.managedPrices).toEqual({
      origins: ["http://localhost:14000", "https://beancount.io"],
      refreshMs: 30_000,
      retryMs: 5_000,
      staleMs: 600_000,
      fetchTimeoutMs: 5000,
      maxBodyBytes: 4096,
      maxFeedsPerLedger: 2,
    });
    expect(
      loadConfig({ MANAGED_PRICE_ORIGINS: "" } as NodeJS.ProcessEnv).managedPrices
        .origins,
    ).toEqual([]);
  });

  it("normalizes and dedupes managed price origins", () => {
    expect(
      loadConfig({
        MANAGED_PRICE_ORIGINS:
          "https://beancount.io/prices/BTC-USD,https://BEANCOUNT.io,,https://a.example:8443/p",
      } as NodeJS.ProcessEnv).managedPrices.origins,
    ).toEqual(["https://beancount.io", "https://a.example:8443"]);
  });

  it("reads env overrides, including numeric ports", () => {
    const cfg = loadConfig({
      PORT: "9000",
      GITEA_HOST_NAME: "gitea",
      GITEA_HTTP_PORT: "3701",
      WEBHOOK_TOKEN: "tok",
      BACKEND_V2_HOST_NAME: "bv2",
      BACKEND_V2_HTTP_PORT: "4105",
      BACKEND_V2_ADMIN_TOKEN: "admin",
      LOKI_HOST: "http://loki:3100",
      NODE_ENV: "production",
    } as NodeJS.ProcessEnv);
    expect(cfg.port).toBe(9000);
    expect(cfg.env).toBe("production");
    expect(cfg.gitea).toEqual({
      hostName: "gitea",
      httpPort: 3701,
      baseUrl: "http://gitea:3701",
    });
    expect(cfg.backendV2).toEqual({
      hostName: "bv2",
      httpPort: 4105,
      adminToken: "admin",
    });
    expect(cfg.loki).toEqual({ host: "http://loki:3100" });
  });
});
