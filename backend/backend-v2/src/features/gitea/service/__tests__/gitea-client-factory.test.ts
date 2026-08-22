import {
  createGiteaClient,
  createGiteaTokenClient,
} from "../gitea-client-factory";
import { Api as GiteaApi } from "../../client/gitea-api";
import { config } from "@/config/config";

// Mock the GiteaApi class
jest.mock("../../client/gitea-api");

describe("Gitea Client Factory", () => {
  const mockGiteaApi = GiteaApi as jest.MockedClass<typeof GiteaApi>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createGiteaClient (Basic Auth)", () => {
    it("should create GiteaApi client with correct baseUrl from config", () => {
      const username = "testuser";
      const password = "testpass";

      createGiteaClient(username, password);

      const expectedBaseUrl = `http://${config.gitea.internalHostname}:${config.gitea.httpPort}/api/v1`;

      expect(mockGiteaApi).toHaveBeenCalledWith(
        expect.objectContaining({
          baseUrl: expectedBaseUrl,
        }),
      );
    });

    it("should create Basic Auth header with correct Base64 encoding", () => {
      const username = "testuser";
      const password = "testpass";

      createGiteaClient(username, password);

      // Expected: Base64("testuser:testpass") = "dGVzdHVzZXI6dGVzdHBhc3M="
      const expectedCredentials = Buffer.from(
        `${username}:${password}`,
      ).toString("base64");
      const expectedAuthHeader = `Basic ${expectedCredentials}`;

      expect(mockGiteaApi).toHaveBeenCalledWith(
        expect.objectContaining({
          baseApiParams: {
            headers: {
              Authorization: expectedAuthHeader,
            },
          },
        }),
      );
    });

    it("should handle special characters in username and password", () => {
      const username = "user@example.com";
      const password = "p@ss:w0rd!#$%";

      createGiteaClient(username, password);

      const expectedCredentials = Buffer.from(
        `${username}:${password}`,
      ).toString("base64");
      const expectedAuthHeader = `Basic ${expectedCredentials}`;

      expect(mockGiteaApi).toHaveBeenCalledWith(
        expect.objectContaining({
          baseApiParams: {
            headers: {
              Authorization: expectedAuthHeader,
            },
          },
        }),
      );
    });

    it("should handle empty username", () => {
      const username = "";
      const password = "testpass";

      createGiteaClient(username, password);

      const expectedCredentials = Buffer.from(
        `${username}:${password}`,
      ).toString("base64");
      const expectedAuthHeader = `Basic ${expectedCredentials}`;

      expect(mockGiteaApi).toHaveBeenCalledWith(
        expect.objectContaining({
          baseApiParams: {
            headers: {
              Authorization: expectedAuthHeader,
            },
          },
        }),
      );
    });

    it("should handle empty password", () => {
      const username = "testuser";
      const password = "";

      createGiteaClient(username, password);

      const expectedCredentials = Buffer.from(
        `${username}:${password}`,
      ).toString("base64");
      const expectedAuthHeader = `Basic ${expectedCredentials}`;

      expect(mockGiteaApi).toHaveBeenCalledWith(
        expect.objectContaining({
          baseApiParams: {
            headers: {
              Authorization: expectedAuthHeader,
            },
          },
        }),
      );
    });

    it("should handle Unicode characters in credentials", () => {
      const username = "用户名";
      const password = "密码123";

      createGiteaClient(username, password);

      const expectedCredentials = Buffer.from(
        `${username}:${password}`,
      ).toString("base64");
      const expectedAuthHeader = `Basic ${expectedCredentials}`;

      expect(mockGiteaApi).toHaveBeenCalledWith(
        expect.objectContaining({
          baseApiParams: {
            headers: {
              Authorization: expectedAuthHeader,
            },
          },
        }),
      );
    });

    it("should return GiteaApi instance", () => {
      const mockInstance = { api: "mock" };
      mockGiteaApi.mockImplementation(() => mockInstance as any);

      const result = createGiteaClient("user", "pass");

      expect(result).toBe(mockInstance);
    });

    it("should create new client instance for each call", () => {
      createGiteaClient("user1", "pass1");
      createGiteaClient("user2", "pass2");

      expect(mockGiteaApi).toHaveBeenCalledTimes(2);
    });
  });

  describe("createGiteaTokenClient (Token Auth)", () => {
    it("should create GiteaApi client with correct baseUrl from config", () => {
      const apiToken = "test-token-123";

      createGiteaTokenClient(apiToken);

      const expectedBaseUrl = `http://${config.gitea.internalHostname}:${config.gitea.httpPort}/api/v1`;

      expect(mockGiteaApi).toHaveBeenCalledWith(
        expect.objectContaining({
          baseUrl: expectedBaseUrl,
        }),
      );
    });

    it("should create Authorization header with token prefix", () => {
      const apiToken = "test-token-123";

      createGiteaTokenClient(apiToken);

      expect(mockGiteaApi).toHaveBeenCalledWith(
        expect.objectContaining({
          baseApiParams: {
            headers: {
              Authorization: `token ${apiToken}`,
            },
          },
        }),
      );
    });

    it("should handle long API tokens", () => {
      const apiToken = "a".repeat(256); // Very long token

      createGiteaTokenClient(apiToken);

      expect(mockGiteaApi).toHaveBeenCalledWith(
        expect.objectContaining({
          baseApiParams: {
            headers: {
              Authorization: `token ${apiToken}`,
            },
          },
        }),
      );
    });

    it("should handle empty API token", () => {
      const apiToken = "";

      createGiteaTokenClient(apiToken);

      expect(mockGiteaApi).toHaveBeenCalledWith(
        expect.objectContaining({
          baseApiParams: {
            headers: {
              Authorization: "token ",
            },
          },
        }),
      );
    });

    it("should handle API token with special characters", () => {
      const apiToken = "abc-123_XYZ.456";

      createGiteaTokenClient(apiToken);

      expect(mockGiteaApi).toHaveBeenCalledWith(
        expect.objectContaining({
          baseApiParams: {
            headers: {
              Authorization: `token ${apiToken}`,
            },
          },
        }),
      );
    });

    it("should return GiteaApi instance", () => {
      const mockInstance = { api: "mock" };
      mockGiteaApi.mockImplementation(() => mockInstance as any);

      const result = createGiteaTokenClient("token");

      expect(result).toBe(mockInstance);
    });

    it("should create new client instance for each call", () => {
      createGiteaTokenClient("token1");
      createGiteaTokenClient("token2");

      expect(mockGiteaApi).toHaveBeenCalledTimes(2);
    });
  });

  describe("URL Construction", () => {
    it("should use correct hostname and port from config", () => {
      createGiteaClient("user", "pass");

      const expectedBaseUrl = `http://${config.gitea.internalHostname}:${config.gitea.httpPort}/api/v1`;

      expect(mockGiteaApi).toHaveBeenCalledWith(
        expect.objectContaining({
          baseUrl: expectedBaseUrl,
        }),
      );
    });

    it("should construct same URL for both client types", () => {
      createGiteaClient("user", "pass");
      const basicAuthCall = mockGiteaApi.mock.calls[0]?.[0];

      mockGiteaApi.mockClear();

      createGiteaTokenClient("token");
      const tokenAuthCall = mockGiteaApi.mock.calls[0]?.[0];

      expect(basicAuthCall?.baseUrl).toBe(tokenAuthCall?.baseUrl);
    });

    it("should include /api/v1 path in baseUrl", () => {
      createGiteaClient("user", "pass");

      const callArgs = mockGiteaApi.mock.calls[0]?.[0];
      expect(callArgs?.baseUrl).toMatch(/\/api\/v1$/);
    });
  });

  describe("Authentication Header Formats", () => {
    it("should use different authorization schemes for Basic vs Token", () => {
      const username = "user";
      const password = "pass";
      const token = "token123";

      createGiteaClient(username, password);
      const basicAuthCall = mockGiteaApi.mock.calls[0]?.[0];
      const basicHeaders = basicAuthCall?.baseApiParams?.headers as
        | Record<string, string>
        | undefined;

      mockGiteaApi.mockClear();

      createGiteaTokenClient(token);
      const tokenAuthCall = mockGiteaApi.mock.calls[0]?.[0];
      const tokenHeaders = tokenAuthCall?.baseApiParams?.headers as
        | Record<string, string>
        | undefined;

      // Basic Auth should start with "Basic "
      expect(basicHeaders?.Authorization).toMatch(/^Basic /);

      // Token Auth should start with "token "
      expect(tokenHeaders?.Authorization).toMatch(/^token /);
    });

    it("should properly encode credentials in Basic Auth", () => {
      const username = "admin";
      const password = "secret";

      createGiteaClient(username, password);

      const callArgs = mockGiteaApi.mock.calls[0]?.[0];
      const headers = callArgs?.baseApiParams?.headers as
        | Record<string, string>
        | undefined;
      const authHeader = headers?.Authorization;

      expect(authHeader).toBeDefined();
      // Extract the Base64 part
      const base64Credentials = authHeader!.replace("Basic ", "");

      // Decode and verify
      const decodedCredentials = Buffer.from(
        base64Credentials,
        "base64",
      ).toString("utf-8");
      expect(decodedCredentials).toBe(`${username}:${password}`);
    });

    it("should not encode token in Token Auth", () => {
      const token = "plain-text-token";

      createGiteaTokenClient(token);

      const callArgs = mockGiteaApi.mock.calls[0]?.[0];
      const headers = callArgs?.baseApiParams?.headers as
        | Record<string, string>
        | undefined;
      const authHeader = headers?.Authorization;

      // Token should be plain text after "token " prefix
      expect(authHeader).toBe(`token ${token}`);
    });
  });

  describe("Integration", () => {
    it("should create functional clients with different auth methods", () => {
      const mockBasicClient = { type: "basic" };
      const mockTokenClient = { type: "token" };

      mockGiteaApi
        .mockImplementationOnce(() => mockBasicClient as any)
        .mockImplementationOnce(() => mockTokenClient as any);

      const basicClient = createGiteaClient("user", "pass");
      const tokenClient = createGiteaTokenClient("token");

      expect(basicClient).toBe(mockBasicClient);
      expect(tokenClient).toBe(mockTokenClient);
      expect(basicClient).not.toBe(tokenClient);
    });

    it("should create multiple independent clients", () => {
      // Create multiple clients with different credentials
      createGiteaClient("user1", "pass1");
      createGiteaClient("user2", "pass2");
      createGiteaTokenClient("token1");
      createGiteaTokenClient("token2");

      // All clients should be created
      expect(mockGiteaApi).toHaveBeenCalledTimes(4);

      // Each call should have different credentials
      const calls = mockGiteaApi.mock.calls;
      const headers0 = calls[0]?.[0]?.baseApiParams?.headers as
        | Record<string, string>
        | undefined;
      const headers1 = calls[1]?.[0]?.baseApiParams?.headers as
        | Record<string, string>
        | undefined;
      const headers2 = calls[2]?.[0]?.baseApiParams?.headers as
        | Record<string, string>
        | undefined;
      const headers3 = calls[3]?.[0]?.baseApiParams?.headers as
        | Record<string, string>
        | undefined;

      expect(headers0?.Authorization).not.toBe(headers1?.Authorization);
      expect(headers2?.Authorization).not.toBe(headers3?.Authorization);
    });
  });
});
