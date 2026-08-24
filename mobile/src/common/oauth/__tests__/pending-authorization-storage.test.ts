import type { PendingOAuthAuthorization } from "../authorization-result";

describe("pending authorization secure storage", () => {
  const secureStorePath = require.resolve("expo-secure-store");
  let originalSecureStoreModule: NodeModule | undefined;
  let stored: string | null;
  let storage: typeof import("../pending-authorization-storage");

  const pending: PendingOAuthAuthorization = {
    flow: "sign_in",
    serverUrl: "https://books.example.test/",
    resource: "https://books.example.test/v1",
    issuer: "https://books.example.test",
    authorizationEndpoint: "https://books.example.test/oauth/auth",
    tokenEndpoint: "https://books.example.test/oauth/token",
    revocationEndpoint: "https://books.example.test/oauth/revoke",
    clientId: "beancount-mobile",
    scopes: [
      "openid",
      "offline_access",
      "ledger.read",
      "ledger.write",
      "ledger.admin",
    ],
    redirectUri: "io.beancount.ios:/oauth/callback",
    state: "state",
    codeVerifier: "secret-verifier",
    createdAt: 1_000,
  };

  beforeEach(() => {
    originalSecureStoreModule = require.cache[secureStorePath];
    stored = null;
    require.cache[secureStorePath] = {
      exports: {
        setItemAsync: async (_key: string, value: string) => {
          stored = value;
        },
        getItemAsync: async () => stored,
        deleteItemAsync: async () => {
          stored = null;
        },
      },
    } as NodeModule;
    const modulePath = require.resolve("../pending-authorization-storage");
    delete require.cache[modulePath];
    storage = require("../pending-authorization-storage");
  });

  afterEach(() => {
    delete require.cache[require.resolve("../pending-authorization-storage")];
    if (originalSecureStoreModule) {
      require.cache[secureStorePath] = originalSecureStoreModule;
    } else {
      delete require.cache[secureStorePath];
    }
  });

  it("persists the PKCE verifier for warm or cold callback completion", async () => {
    await storage.savePendingAuthorization(pending);
    expect(await storage.loadPendingAuthorization()).toEqual(pending);
    await storage.clearPendingAuthorization();
    expect(await storage.loadPendingAuthorization()).toBe(null);
  });
});
