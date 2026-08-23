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
