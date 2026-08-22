import type { GiteaConfig } from "@/config/config";

import { generateGiteaUrl } from "./gitea-utils";

describe("generateGiteaUrl", () => {
  describe("HTTP URL generation", () => {
    it("should generate HTTP URL with externalHttpPort", () => {
      const config: GiteaConfig = {
        hostname: "192.168.4.49",
        internalHostname: "gitea",
        httpPort: 3000,
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
        externalHttpPort: 3000,
        sshPort: 2222,
      };

      const result = generateGiteaUrl(config, "user/repo");

      expect(result.httpUrl).toBe("http://localhost:3000/user/repo.git");
      expect(result.sshUrl).toBe("ssh://git@localhost:2222/user/repo.git");
    });
  });
});
