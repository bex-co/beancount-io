import "reflect-metadata";
import { createAnonymousFavaApi, createFavaApi } from "../create-client";
import { ApiClient } from "../api-client";

// Mock ApiClient
jest.mock("../api-client");

describe("createFavaApi", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should create Fava API client with correct configuration", () => {
    const baseUrl = "http://localhost:5000";
    const username = "admin";
    const password = "secret-password";

    const expectedAuth = `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;

    const api = createFavaApi(baseUrl, username, password);

    expect(ApiClient).toHaveBeenCalledWith({
      baseUrl,
      baseApiParams: {
        headers: {
          Authorization: expectedAuth,
        },
      },
    });

    expect(api).toBeDefined();
  });

  it("should create proper Basic Auth header", () => {
    const baseUrl = "https://fava.example.com";
    const username = "test-user";
    const password = "test-pass";

    createFavaApi(baseUrl, username, password);

    // Verify the auth header is correctly encoded
    const expectedAuth = Buffer.from(`${username}:${password}`).toString(
      "base64",
    );
    expect(ApiClient).toHaveBeenCalledWith(
      expect.objectContaining({
        baseUrl,
        baseApiParams: expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Basic ${expectedAuth}`,
          }),
        }),
      }),
    );
  });

  it("should handle special characters in credentials", () => {
    const baseUrl = "http://api.local";
    const username = "user@example.com";
    const password = "p@ssw0rd!#$%";

    createFavaApi(baseUrl, username, password);

    const expectedAuth = Buffer.from(`${username}:${password}`).toString(
      "base64",
    );

    expect(ApiClient).toHaveBeenCalledWith({
      baseUrl,
      baseApiParams: {
        headers: {
          Authorization: `Basic ${expectedAuth}`,
        },
      },
    });
  });

  it("should work with empty credentials", () => {
    const baseUrl = "http://public-api.local";
    const username = "";
    const password = "";

    createFavaApi(baseUrl, username, password);

    const expectedAuth = Buffer.from(":").toString("base64");

    expect(ApiClient).toHaveBeenCalledWith({
      baseUrl,
      baseApiParams: {
        headers: {
          Authorization: `Basic ${expectedAuth}`,
        },
      },
    });
  });

  it("should preserve baseUrl format", () => {
    const testCases = [
      "http://localhost:5000",
      "https://api.example.com",
      "http://192.168.1.1:8080",
      "https://subdomain.domain.com/api/v1",
    ];

    testCases.forEach((baseUrl) => {
      jest.clearAllMocks();
      createFavaApi(baseUrl, "user", "pass");

      expect(ApiClient).toHaveBeenCalledWith(
        expect.objectContaining({
          baseUrl,
        }),
      );
    });
  });

  it("uses the private anonymous-read protocol without a user credential", () => {
    createAnonymousFavaApi("http://ledger.internal");

    expect(ApiClient).toHaveBeenCalledWith({
      baseUrl: "http://ledger.internal",
      baseApiParams: { headers: { Authorization: "Anonymous" } },
    });
  });
});
