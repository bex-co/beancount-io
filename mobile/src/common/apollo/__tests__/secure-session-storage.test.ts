describe("secureSessionStorage", () => {
  const secureStorePath = require.resolve("expo-secure-store");
  const asyncStoragePath =
    require.resolve("@react-native-async-storage/async-storage");

  let originalSecureStoreModule: NodeModule | undefined;
  let originalAsyncStorageModule: NodeModule | undefined;

  const secureStoreMock = {
    getItemAsync: async (_key: string) => null as string | null,
    setItemAsync: async (_key: string, _value: string) => {},
  };

  const asyncStorageMock = {
    getItem: async (_key: string) => null as string | null,
    removeItem: async (_key: string) => {},
  };

  let secureSessionStorage: typeof import("../secure-session-storage").secureSessionStorage;

  beforeEach(() => {
    originalSecureStoreModule = require.cache[secureStorePath];
    originalAsyncStorageModule = require.cache[asyncStoragePath];

    secureStoreMock.getItemAsync = async () => null;
    secureStoreMock.setItemAsync = async () => {};
    asyncStorageMock.getItem = async () => null;
    asyncStorageMock.removeItem = async () => {};

    require.cache[secureStorePath] = {
      exports: secureStoreMock,
    } as NodeModule;
    require.cache[asyncStoragePath] = {
      exports: asyncStorageMock,
    } as NodeModule;

    const modulePath = require.resolve("../secure-session-storage");
    delete require.cache[modulePath];
    ({ secureSessionStorage } = require("../secure-session-storage"));
  });

  afterEach(() => {
    const modulePath = require.resolve("../secure-session-storage");
    delete require.cache[modulePath];

    if (originalSecureStoreModule) {
      require.cache[secureStorePath] = originalSecureStoreModule;
    } else {
      delete require.cache[secureStorePath];
    }

    if (originalAsyncStorageModule) {
      require.cache[asyncStoragePath] = originalAsyncStorageModule;
    } else {
      delete require.cache[asyncStoragePath];
    }
  });

  it("returns the secure value without touching AsyncStorage", async () => {
    const legacyReads: string[] = [];
    secureStoreMock.getItemAsync = async (key: string) =>
      key === "session" ? '{"userId":"u1"}' : null;
    asyncStorageMock.getItem = async (key: string) => {
      legacyReads.push(key);
      return null;
    };

    const value = await secureSessionStorage.getItem("session");

    expect(value).toBe('{"userId":"u1"}');
    expect(legacyReads).toEqual([]);
  });

  it("migrates a legacy AsyncStorage value into secure storage", async () => {
    const secureWrites: Array<{ key: string; value: string }> = [];
    const legacyRemovals: string[] = [];
    asyncStorageMock.getItem = async (key: string) =>
      key === "session" ? '{"userId":"legacy"}' : null;
    secureStoreMock.setItemAsync = async (key: string, value: string) => {
      secureWrites.push({ key, value });
    };
    asyncStorageMock.removeItem = async (key: string) => {
      legacyRemovals.push(key);
    };

    const value = await secureSessionStorage.getItem("session");

    expect(value).toBe('{"userId":"legacy"}');
    expect(secureWrites).toEqual([
      { key: "session", value: '{"userId":"legacy"}' },
    ]);
    expect(legacyRemovals).toEqual(["session"]);
  });

  it("returns null when neither store has a value", async () => {
    const value = await secureSessionStorage.getItem("session");
    expect(value).toBe(null);
  });

  it("writes only to secure storage", async () => {
    const secureWrites: Array<{ key: string; value: string }> = [];
    secureStoreMock.setItemAsync = async (key: string, value: string) => {
      secureWrites.push({ key, value });
    };

    await secureSessionStorage.setItem("session", '{"authToken":"t"}');

    expect(secureWrites).toEqual([
      { key: "session", value: '{"authToken":"t"}' },
    ]);
  });
});
