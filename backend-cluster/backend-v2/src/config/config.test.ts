import {
  assertOAuthInteractionHost,
  config,
  getOAuthPublicUrl,
} from "./config";

describe("config", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("should have correct default values", () => {
    expect(config.project).toBe("beancount-io");
    expect(config.jwt.expMins).toBe(525600);
    expect(config.analytics.gaMeasurementId).toBe("G-94TFG6X2Q5");
  });

  it("should read env from NODE_ENV", () => {
    // Jest sets NODE_ENV to "test" by default, and config now recognizes
    // "development", "test", and "production"
    expect(config.env).toBe("test");
  });

  it("should have correct server defaults", () => {
    expect(config.server.proxy).toBe(true);
    expect(config.server.port).toBe(4104);
  });

  it("should have correct logger defaults", () => {
    expect(config.logger.enabled).toBe(true);
    expect(config.logger.level).toBe("debug");
  });

  it("should have correct gitea defaults", () => {
    expect(config.gitea.hostname).toBe("git.beancount.io");
    expect(config.gitea.httpPort).toBe(3000);
    expect(config.gitea.sshPort).toBe(2222);
  });

  it("should have correct dashboard URL default", () => {
    expect(config.dashboard.url).toBe("https://beancount.io");
  });

  describe("OAuth public URL validation", () => {
    it("normalizes a path-prefixed HTTPS issuer", () => {
      expect(
        getOAuthPublicUrl(
          "https://books.example.test/beancount/",
          "https://beancount.io",
          "OAUTH_ISSUER",
          "production",
        ),
      ).toBe("https://books.example.test/beancount");
    });

    it.each([
      "",
      "not a url",
      "https://user@example.test",
      "https://example.test?a=1",
    ])("rejects malformed or ambiguous value %p", (value) => {
      expect(() =>
        getOAuthPublicUrl(
          value,
          "https://beancount.io",
          "OAUTH_ISSUER",
          "production",
        ),
      ).toThrow(Error);
    });

    it("permits cleartext only for loopback development", () => {
      expect(
        getOAuthPublicUrl(
          "http://localhost:42601",
          "https://beancount.io",
          "OAUTH_ISSUER",
          "development",
        ),
      ).toBe("http://localhost:42601");
      expect(() =>
        getOAuthPublicUrl(
          "http://books.example.test",
          "https://beancount.io",
          "OAUTH_ISSUER",
          "development",
        ),
      ).toThrow(Error);
      expect(() =>
        getOAuthPublicUrl(
          "http://localhost:42601",
          "https://beancount.io",
          "OAUTH_ISSUER",
          "production",
        ),
      ).toThrow(Error);
    });

    it("requires interaction pages to share the issuer hostname", () => {
      expect(() =>
        assertOAuthInteractionHost(
          "http://localhost:42601",
          "http://localhost:42600",
        ),
      ).not.toThrow();
      expect(() =>
        assertOAuthInteractionHost(
          "https://auth.example.test",
          "https://dashboard.example.test",
        ),
      ).toThrow(Error);
    });
  });

  describe("gitea configuration structure", () => {
    it("should have internalHostname property", () => {
      expect(config.gitea).toHaveProperty("internalHostname");
      expect(typeof config.gitea.internalHostname).toBe("string");
    });

    it("should have hostname property", () => {
      expect(config.gitea).toHaveProperty("hostname");
      expect(typeof config.gitea.hostname).toBe("string");
    });

    it("should have httpPort property", () => {
      expect(config.gitea).toHaveProperty("httpPort");
      expect(typeof config.gitea.httpPort).toBe("number");
      expect(config.gitea.httpPort).toBeGreaterThan(0);
    });

    it("should have sshPort property", () => {
      expect(config.gitea).toHaveProperty("sshPort");
      expect(typeof config.gitea.sshPort).toBe("number");
      expect(config.gitea.sshPort).toBeGreaterThan(0);
    });

    it("should have externalHttpPort property", () => {
      expect(config.gitea).toHaveProperty("externalHttpPort");
      expect(typeof config.gitea.externalHttpPort).toBe("number");
      expect(config.gitea.externalHttpPort).toBeGreaterThan(0);
    });

    it("should have valid port numbers", () => {
      expect(config.gitea.httpPort).toBeLessThanOrEqual(65535);
      expect(config.gitea.externalHttpPort).toBeLessThanOrEqual(65535);
      expect(config.gitea.sshPort).toBeLessThanOrEqual(65535);
    });
  });

  describe("plaid configuration", () => {
    it("should have correct default environment", () => {
      expect(config.plaid.environment).toBe("sandbox");
    });

    it("should have valid environment value", () => {
      const validEnvironments = ["sandbox", "development", "production"];
      expect(validEnvironments).toContain(config.plaid.environment);
    });

    it("should have plaid properties", () => {
      expect(config.plaid).toHaveProperty("clientId");
      expect(config.plaid).toHaveProperty("secret");
      expect(config.plaid).toHaveProperty("environment");
      expect(config.plaid).toHaveProperty("webhookUrl");
    });

    it("should have correct plaid property types", () => {
      expect(typeof config.plaid.clientId).toBe("string");
      expect(typeof config.plaid.secret).toBe("string");
      expect(typeof config.plaid.environment).toBe("string");
      expect(typeof config.plaid.webhookUrl).toBe("string");
    });
  });
});
