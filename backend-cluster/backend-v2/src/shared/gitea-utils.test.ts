import type { GiteaConfig } from "@/config/config";

import {
  generateGiteaUrl,
  giteaRootFromUser,
  learnExternalGitHost,
} from "./gitea-utils";

describe("generateGiteaUrl", () => {
  describe("HTTP URL generation", () => {
    it("should generate HTTP URL with externalHttpPort", () => {
      const config: GiteaConfig = {
        hostname: "192.168.4.49",
        internalHostname: "gitea",
        httpPort: 3000,
        internalBaseUrl: "http://gitea:3000",
        externalHttpPort: 3701,
        sshPort: 2223,
      };

      const result = generateGiteaUrl(config, "user/repo");

      expect(result.httpUrl).toBe("http://192.168.4.49:3701/user/repo.git");
    });

    it("should auto-detect HTTPS for production domain with port 3000", () => {
      const config: GiteaConfig = {
        hostname: "git.beancount.io",
        internalHostname: "gitea",
        httpPort: 3000,
        internalBaseUrl: "http://gitea:3000",
        externalHttpPort: 3000,
        sshPort: 2222,
      };

      const result = generateGiteaUrl(config, "user/repo");

      expect(result.httpUrl).toBe(
        "https://git.beancount.io:3000/user/repo.git",
      );
    });

    it("should auto-detect HTTPS for production domain and omit standard port 443", () => {
      const config: GiteaConfig = {
        hostname: "git.beancount.io",
        internalHostname: "gitea",
        httpPort: 3000,
        internalBaseUrl: "http://gitea:3000",
        externalHttpPort: 443,
        sshPort: 2222,
      };

      const result = generateGiteaUrl(config, "user/repo");

      expect(result.httpUrl).toBe("https://git.beancount.io/user/repo.git");
    });

    it("should use HTTP for localhost and omit standard port 80", () => {
      const config: GiteaConfig = {
        hostname: "localhost",
        internalHostname: "gitea",
        httpPort: 3000,
        internalBaseUrl: "http://gitea:3000",
        externalHttpPort: 80,
        sshPort: 2222,
      };

      const result = generateGiteaUrl(config, "user/repo");

      expect(result.httpUrl).toBe("http://localhost/user/repo.git");
    });

    it("should auto-detect HTTPS for production domain with non-standard port", () => {
      const config: GiteaConfig = {
        hostname: "git.beancount.io",
        internalHostname: "gitea",
        httpPort: 3000,
        internalBaseUrl: "http://gitea:3000",
        externalHttpPort: 8443,
        sshPort: 2222,
      };

      const result = generateGiteaUrl(config, "user/repo");

      expect(result.httpUrl).toBe(
        "https://git.beancount.io:8443/user/repo.git",
      );
    });

    it("should handle repository names with dashes (auto-detect HTTPS)", () => {
      const config: GiteaConfig = {
        hostname: "git.beancount.io",
        internalHostname: "gitea",
        httpPort: 3000,
        internalBaseUrl: "http://gitea:3000",
        externalHttpPort: 3000,
        sshPort: 2222,
      };

      const result = generateGiteaUrl(config, "user/my-repo-name");

      expect(result.httpUrl).toBe(
        "https://git.beancount.io:3000/user/my-repo-name.git",
      );
    });

    it("should handle repository names with underscores (auto-detect HTTPS)", () => {
      const config: GiteaConfig = {
        hostname: "git.beancount.io",
        internalHostname: "gitea",
        httpPort: 3000,
        internalBaseUrl: "http://gitea:3000",
        externalHttpPort: 3000,
        sshPort: 2222,
      };

      const result = generateGiteaUrl(config, "user/my_repo_name");

      expect(result.httpUrl).toBe(
        "https://git.beancount.io:3000/user/my_repo_name.git",
      );
    });
  });

  describe("SSH URL generation", () => {
    it("should generate SSH URL with custom SSH port", () => {
      const config: GiteaConfig = {
        hostname: "192.168.4.49",
        internalHostname: "gitea",
        httpPort: 3000,
        internalBaseUrl: "http://gitea:3000",
        externalHttpPort: 3701,
        sshPort: 2223,
      };

      const result = generateGiteaUrl(config, "user/repo");

      expect(result.sshUrl).toBe("ssh://git@192.168.4.49:2223/user/repo.git");
    });

    it("should generate SSH URL with default port 2222", () => {
      const config: GiteaConfig = {
        hostname: "git.beancount.io",
        internalHostname: "gitea",
        httpPort: 3000,
        internalBaseUrl: "http://gitea:3000",
        externalHttpPort: 3000,
        sshPort: 2222,
      };

      const result = generateGiteaUrl(config, "user/repo");

      expect(result.sshUrl).toBe(
        "ssh://git@git.beancount.io:2222/user/repo.git",
      );
    });

    it("should generate SSH URL with standard SSH port 22", () => {
      const config: GiteaConfig = {
        hostname: "git.example.com",
        internalHostname: "gitea",
        httpPort: 3000,
        internalBaseUrl: "http://gitea:3000",
        externalHttpPort: 3000,
        sshPort: 22,
      };

      const result = generateGiteaUrl(config, "user/repo");

      expect(result.sshUrl).toBe("ssh://git@git.example.com:22/user/repo.git");
    });
  });

  describe("integration scenarios", () => {
    it("should generate both HTTP and SSH URLs for Mac development config", () => {
      const config: GiteaConfig = {
        hostname: "192.168.4.49",
        internalHostname: "gitea",
        httpPort: 3000,
        internalBaseUrl: "http://gitea:3000",
        externalHttpPort: 3701,
        sshPort: 2223,
      };

      const result = generateGiteaUrl(config, "testuser/my-ledger");

      expect(result.httpUrl).toBe(
        "http://192.168.4.49:3701/testuser/my-ledger.git",
      );
      expect(result.sshUrl).toBe(
        "ssh://git@192.168.4.49:2223/testuser/my-ledger.git",
      );
    });

    it("should auto-detect HTTPS for production domain with non-standard port", () => {
      const config: GiteaConfig = {
        hostname: "git.beancount.io",
        internalHostname: "gitea",
        httpPort: 3000,
        internalBaseUrl: "http://gitea:3000",
        externalHttpPort: 3000,
        sshPort: 2222,
      };

      const result = generateGiteaUrl(config, "production/ledger");

      expect(result.httpUrl).toBe(
        "https://git.beancount.io:3000/production/ledger.git",
      );
      expect(result.sshUrl).toBe(
        "ssh://git@git.beancount.io:2222/production/ledger.git",
      );
    });

    it("should auto-detect HTTPS for production domain with standard port 443", () => {
      const config: GiteaConfig = {
        hostname: "git.beancount.io",
        internalHostname: "gitea",
        httpPort: 3000,
        internalBaseUrl: "http://gitea:3000",
        externalHttpPort: 443,
        sshPort: 2222,
      };

      const result = generateGiteaUrl(config, "production/ledger");

      expect(result.httpUrl).toBe(
        "https://git.beancount.io/production/ledger.git",
      );
      expect(result.sshUrl).toBe(
        "ssh://git@git.beancount.io:2222/production/ledger.git",
      );
    });
  });

  describe("edge cases", () => {
    it("should handle repository with numeric characters (auto-detect HTTPS)", () => {
      const config: GiteaConfig = {
        hostname: "git.beancount.io",
        internalHostname: "gitea",
        httpPort: 3000,
        internalBaseUrl: "http://gitea:3000",
        externalHttpPort: 3000,
        sshPort: 2222,
      };

      const result = generateGiteaUrl(config, "user/repo2024");

      expect(result.httpUrl).toBe(
        "https://git.beancount.io:3000/user/repo2024.git",
      );
      expect(result.sshUrl).toBe(
        "ssh://git@git.beancount.io:2222/user/repo2024.git",
      );
    });

    it("should handle repository with dots in name (auto-detect HTTPS)", () => {
      const config: GiteaConfig = {
        hostname: "git.beancount.io",
        internalHostname: "gitea",
        httpPort: 3000,
        internalBaseUrl: "http://gitea:3000",
        externalHttpPort: 3000,
        sshPort: 2222,
      };

      const result = generateGiteaUrl(config, "user/my.repo.name");

      expect(result.httpUrl).toBe(
        "https://git.beancount.io:3000/user/my.repo.name.git",
      );
      expect(result.sshUrl).toBe(
        "ssh://git@git.beancount.io:2222/user/my.repo.name.git",
      );
    });

    it("should use HTTP for localhost hostname", () => {
      const config: GiteaConfig = {
        hostname: "localhost",
        internalHostname: "gitea",
        httpPort: 3000,
        internalBaseUrl: "http://gitea:3000",
        externalHttpPort: 3000,
        sshPort: 2222,
      };

      const result = generateGiteaUrl(config, "user/repo");

      expect(result.httpUrl).toBe("http://localhost:3000/user/repo.git");
      expect(result.sshUrl).toBe("ssh://git@localhost:2222/user/repo.git");
    });
  });
});

function managedDefault(): GiteaConfig {
  return {
    hostname: "git.beancount.io",
    internalHostname: "gitea",
    httpPort: 3000,
    internalBaseUrl: "http://gitea:3000",
    externalHttpPort: 443,
    sshPort: 2222,
  };
}

function giteaAnswering(
  ...answers: Array<{ status: number; body?: unknown } | Error>
): jest.Mock {
  const fetchFn = jest.fn();
  for (const answer of answers) {
    if (answer instanceof Error) {
      fetchFn.mockRejectedValueOnce(answer);
    } else {
      fetchFn.mockResolvedValueOnce({
        ok: answer.status >= 200 && answer.status < 300,
        status: answer.status,
        json: async () => answer.body,
      });
    }
  }
  return fetchFn;
}

const admin = { adminUser: "beancount_admin", adminPassword: "pw" };

describe("SSH address when no Git over SSH is served", () => {
  it("returns no sshUrl and keeps the HTTP address", () => {
    const result = generateGiteaUrl(
      {
        ...managedDefault(),
        hostname: "git.example.com",
        sshUnavailable: true,
      },
      "alice/main",
    );
    expect(result.sshUrl).toBeNull();
    expect(result.httpUrl).toBe("https://git.example.com/alice/main.git");
  });
});

describe("a stack that says where its Git proxy is (GIT_PUBLIC_URL)", () => {
  // bex: Gitea is private, so users clone through this API's own /git.
  const proxied = (): GiteaConfig => ({
    ...managedDefault(),
    hostname: "api.example.test",
    externalBaseUrl: "https://api.example.test/git",
    cloneBaseIsGitProxy: true,
    sshUnavailable: true,
  });

  it("builds the clone address on the proxy's /git, and advertises no SSH one", () => {
    expect(generateGiteaUrl(proxied(), "alice/main")).toEqual({
      sshUrl: null,
      httpUrl: "https://api.example.test/git/alice/main.git",
    });
  });

  it("does not ask Gitea for its address", async () => {
    // The default host with a base already set: nothing but the base itself
    // tells the stack it is configured.
    const gitea = {
      ...managedDefault(),
      externalBaseUrl: "https://api.example.test/git",
    };
    const fetchFn = jest.fn();
    await learnExternalGitHost(gitea, { selfHost: true, ...admin, fetchFn });
    expect(fetchFn).not.toHaveBeenCalled();
    expect(gitea.externalBaseUrl).toBe("https://api.example.test/git");
  });
});

describe("learnExternalGitHost", () => {
  it("gives a self-hosted stack with no configured host the address Gitea reports", async () => {
    const gitea = managedDefault();
    const fetchFn = giteaAnswering({
      status: 200,
      body: {
        login: "beancount_admin",
        html_url: "https://beancount-gitea-x1.onbex.co/beancount_admin",
      },
    });

    await learnExternalGitHost(gitea, { selfHost: true, ...admin, fetchFn });

    expect(fetchFn).toHaveBeenCalledWith(
      "http://gitea:3000/api/v1/user",
      expect.objectContaining({
        headers: {
          Authorization: `Basic ${Buffer.from("beancount_admin:pw").toString("base64")}`,
        },
      }),
    );
    const urls = generateGiteaUrl(gitea, "alice/main");
    expect(urls.httpUrl).toBe(
      "https://beancount-gitea-x1.onbex.co/alice/main.git",
    );
    expect(urls.sshUrl).toBe(
      "ssh://git@beancount-gitea-x1.onbex.co:2222/alice/main.git",
    );
    expect(JSON.stringify(urls)).not.toContain("git.beancount.io");
  });

  it("keeps the scheme, port and sub-path Gitea serves on", async () => {
    const gitea = managedDefault();
    await learnExternalGitHost(gitea, {
      selfHost: true,
      ...admin,
      fetchFn: giteaAnswering({
        status: 200,
        body: {
          login: "admin",
          html_url: "http://git.lan:3000/gitea/admin",
        },
      }),
    });
    expect(generateGiteaUrl(gitea, "alice/main").httpUrl).toBe(
      "http://git.lan:3000/gitea/alice/main.git",
    );
  });

  it("retries while Gitea is starting", async () => {
    const gitea = managedDefault();
    const fetchFn = giteaAnswering(new Error("ECONNREFUSED"), {
      status: 200,
      body: { login: "admin", html_url: "https://git.example.org/admin" },
    });
    await learnExternalGitHost(gitea, {
      selfHost: true,
      ...admin,
      fetchFn,
      retryDelayMs: 0,
    });
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(gitea.hostname).toBe("git.example.org");
  });

  it("refuses to start rather than advertise beancount.io's host", async () => {
    const gitea = managedDefault();
    await expect(
      learnExternalGitHost(gitea, {
        selfHost: true,
        ...admin,
        fetchFn: giteaAnswering(
          { status: 401 },
          { status: 200, body: { login: "admin" } },
        ),
        attempts: 2,
        retryDelayMs: 0,
      }),
    ).rejects.toThrow(/EXTERNAL_GITEA_HOST_NAME/);
    expect(gitea.externalBaseUrl).toBeUndefined();
  });

  it("leaves an explicitly configured host alone", async () => {
    const gitea = { ...managedDefault(), hostname: "git.example.com" };
    const before = generateGiteaUrl(gitea, "alice/main");
    const fetchFn = jest.fn();
    await learnExternalGitHost(gitea, { selfHost: true, ...admin, fetchFn });
    expect(fetchFn).not.toHaveBeenCalled();
    expect(generateGiteaUrl(gitea, "alice/main")).toEqual(before);
    expect(before).toEqual({
      sshUrl: "ssh://git@git.example.com:2222/alice/main.git",
      httpUrl: "https://git.example.com/alice/main.git",
    });
  });

  it("leaves the managed service alone", async () => {
    const gitea = managedDefault();
    const fetchFn = jest.fn();
    await learnExternalGitHost(gitea, { selfHost: false, ...admin, fetchFn });
    expect(fetchFn).not.toHaveBeenCalled();
    expect(generateGiteaUrl(gitea, "alice/main")).toEqual({
      sshUrl: "ssh://git@git.beancount.io:2222/alice/main.git",
      httpUrl: "https://git.beancount.io/alice/main.git",
    });
  });
});

describe("giteaRootFromUser", () => {
  it.each([
    [{ login: "a", html_url: "not a url" }],
    [{ login: "a", html_url: "ftp://git.example.com/a" }],
    [{ login: "a", html_url: "https://git.example.com/someone-else" }],
    [{ login: 1, html_url: "https://git.example.com/1" }],
  ])("rejects %j", (user) => {
    expect(giteaRootFromUser(user)).toBeUndefined();
  });
});
