import {
  assertOAuthInteractionHost,
  config,
  getDevelopmentPremiumUserIds,
  getMcpRegistryAuthProof,
  getOAuthPublicUrl,
  parseGitPublicUrl,
  parseOpenAIBaseUrl,
  parseTrustedProxyHops,
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
  });

  it("should read env from NODE_ENV", () => {
    // Jest sets NODE_ENV to "test" by default, and config now recognizes
    // "development", "test", and "production"
    expect(config.env).toBe("test");
  });

  it("should have correct server defaults", () => {
    expect(config.server.trustedProxyHops).toBe(1);
    expect(config.server.port).toBe(4104);
  });

  it("reads TRUSTED_PROXY_HOPS as a non-negative integer, else one hop", () => {
    expect(parseTrustedProxyHops(undefined)).toBe(1);
    expect(parseTrustedProxyHops("")).toBe(1);
    expect(parseTrustedProxyHops("0")).toBe(0);
    expect(parseTrustedProxyHops("2")).toBe(2);
    for (const bad of ["-1", "1.5", "two", "Infinity"]) {
      expect(parseTrustedProxyHops(bad)).toBe(1);
    }
  });

  it("points the model proxy at OpenAI unless OPENAI_BASE_URL says otherwise", () => {
    expect(config.openai.baseUrl).toBe("https://api.openai.com/v1");
    expect(parseOpenAIBaseUrl(undefined)).toBe("https://api.openai.com/v1");
    expect(parseOpenAIBaseUrl("  ")).toBe("https://api.openai.com/v1");
    expect(parseOpenAIBaseUrl("http://gateway:8080/v1/")).toBe(
      "http://gateway:8080/v1",
    );
    expect(parseOpenAIBaseUrl(" https://example.test/openai/v1// ")).toBe(
      "https://example.test/openai/v1",
    );
  });

  it("limits local premium-user overrides to development", () => {
    expect(
      getDevelopmentPremiumUserIds(" user-a, user-b,user-a ", "development"),
    ).toEqual(new Set(["user-a", "user-b"]));
    expect(getDevelopmentPremiumUserIds("user-a", "production")).toEqual(
      new Set(),
    );
    expect(getDevelopmentPremiumUserIds("user-a", "test")).toEqual(new Set());
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

    // w1/m46: Git over SSH on a self-hosted stack exists only through the SSH
    // proxy, so without it ledgers must not advertise an SSH address.
    it.each([
      [{ SELF_HOST: "true" }, true],
      [{ SELF_HOST: "true", SSH_PROXY_ENABLED: "true" }, true],
      [
        {
          SELF_HOST: "true",
          SSH_PROXY_ENABLED: "true",
          SSH_PROXY_HOST_KEY: "key",
        },
        false,
      ],
      [{}, false],
    ])("marks SSH unavailable for %j: %s", async (env, unavailable) => {
      delete process.env.SELF_HOST;
      delete process.env.SSH_PROXY_ENABLED;
      delete process.env.SSH_PROXY_HOST_KEY;
      Object.assign(process.env, env);
      const { config: loaded } = await import("./config");
      expect(loaded.gitea.sshUnavailable).toBe(unavailable);
    });

    // GIT_PUBLIC_URL: a stack with no public Gitea says where its Git proxy is.
    it("takes the clone address, and its host, from GIT_PUBLIC_URL", async () => {
      delete process.env.EXTERNAL_GITEA_HOST_NAME;
      process.env.GIT_PUBLIC_URL = "https://api.example.test/git/";
      const { config: loaded } = await import("./config");
      expect(loaded.gitea.externalBaseUrl).toBe("https://api.example.test/git");
      expect(loaded.gitea.hostname).toBe("api.example.test");
      expect(loaded.gitea.cloneBaseIsGitProxy).toBe(true);
    });

    it("leaves the managed defaults alone when GIT_PUBLIC_URL is unset or blank", async () => {
      for (const value of [undefined, "", "  "]) {
        jest.resetModules();
        delete process.env.EXTERNAL_GITEA_HOST_NAME;
        if (value === undefined) delete process.env.GIT_PUBLIC_URL;
        else process.env.GIT_PUBLIC_URL = value;
        const { config: loaded } = await import("./config");
        expect(loaded.gitea.externalBaseUrl).toBeUndefined();
        expect(loaded.gitea.hostname).toBe("git.beancount.io");
        expect(loaded.gitea.cloneBaseIsGitProxy).toBe(false);
      }
    });

    it("keeps an explicit EXTERNAL_GITEA_HOST_NAME as the SSH host", async () => {
      process.env.EXTERNAL_GITEA_HOST_NAME = "ssh.example.test";
      process.env.GIT_PUBLIC_URL = "https://api.example.test/git";
      const { config: loaded } = await import("./config");
      expect(loaded.gitea.hostname).toBe("ssh.example.test");
      expect(loaded.gitea.externalBaseUrl).toBe("https://api.example.test/git");
    });

    it.each([
      "api.example.test/git",
      "http://api.example.test/git",
      "https://user:pw@api.example.test/git",
      "https://api.example.test/git?x=1",
    ])("refuses to start on GIT_PUBLIC_URL=%s", async (value) => {
      process.env.GIT_PUBLIC_URL = value;
      await expect(import("./config")).rejects.toThrow(/GIT_PUBLIC_URL/);
    });
  });

  describe("parseGitPublicUrl", () => {
    it("accepts http only for localhost outside production", () => {
      expect(
        parseGitPublicUrl("http://localhost:4104/git", "development"),
      ).toBe("http://localhost:4104/git");
      expect(() =>
        parseGitPublicUrl("http://localhost:4104/git", "production"),
      ).toThrow(/GIT_PUBLIC_URL/);
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

  describe("MCP Registry domain proof", () => {
    const ed25519 =
      "v=MCPv1; k=ed25519; p=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
    const ecdsaP384 =
      "v=MCPv1; k=ecdsap384; p=AgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==";

    it("is unset by default so a self-host serves no proof", () => {
      expect(config.mcpRegistry.authProof).toBeNull();
      expect(getMcpRegistryAuthProof(undefined)).toBeNull();
      expect(getMcpRegistryAuthProof("")).toBeNull();
      expect(getMcpRegistryAuthProof("   ")).toBeNull();
    });

    it("accepts the whole record for either supported algorithm", () => {
      expect(getMcpRegistryAuthProof(ed25519)).toBe(ed25519);
      expect(getMcpRegistryAuthProof(ecdsaP384)).toBe(ecdsaP384);
      // Surrounding whitespace from an env file is not part of the record.
      expect(getMcpRegistryAuthProof(`  ${ed25519}\n`)).toBe(ed25519);
    });

    it("refuses anything that is not the record mcp-publisher emits", () => {
      const expectRefused = (value: string) =>
        expect(() => getMcpRegistryAuthProof(value)).toThrow(
          /MCP_REGISTRY_AUTH_PROOF must be the whole proof record/,
        );
      // A bare key: the operator pasted `p=` without the envelope.
      expectRefused("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=");
      // Wrong version, unknown algorithm, non-base64 key, trailing junk.
      expectRefused(ed25519.replace("MCPv1", "MCPv2"));
      expectRefused(ed25519.replace("ed25519", "rsa"));
      expectRefused("v=MCPv1; k=ed25519; p=not base64!");
      expectRefused(`${ed25519}; extra=1`);
    });
  });
});
