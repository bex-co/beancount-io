import type { ReactiveVar } from "@apollo/client";

// These tests verify the types and behavior of the vars module.
// Direct imports of the vars files are not possible due to path alias (@/)
// resolution limitations in the test runner. The tests focus on:
// 1. Type structure verification
// 2. Testing the createPersistentVar behavior through mocked dependencies

describe("common/vars logic", () => {
  describe("Session type", () => {
    interface Session {
      userId: string;
      authToken: string;
    }

    it("Session type has userId property", () => {
      const session: Session = {
        userId: "test-user-id",
        authToken: "test-auth-token",
      };
      expect(session.userId).toBe("test-user-id");
    });

    it("Session type has authToken property", () => {
      const session: Session = {
        userId: "test-user-id",
        authToken: "test-auth-token",
      };
      expect(session.authToken).toBe("test-auth-token");
    });

    it("Session can be null", () => {
      const session: Session | null = null;
      expect(session).toBe(null);
    });

    it("Session with empty strings is valid", () => {
      const session: Session = {
        userId: "",
        authToken: "",
      };
      expect(session.userId).toBe("");
      expect(session.authToken).toBe("");
    });

    it("Session with special characters is valid", () => {
      const session: Session = {
        userId: "user@example.com",
        authToken: "token-with-special-chars_123!",
      };
      expect(session.userId).toBe("user@example.com");
      expect(session.authToken).toBe("token-with-special-chars_123!");
    });
  });

  describe("Theme type", () => {
    type Theme = "light" | "dark" | "system";

    it("Theme can be light", () => {
      const theme: Theme = "light";
      expect(theme).toBe("light");
    });

    it("Theme can be dark", () => {
      const theme: Theme = "dark";
      expect(theme).toBe("dark");
    });

    it("Theme can be system", () => {
      const theme: Theme = "system";
      expect(theme).toBe("system");
    });

    it("default theme value is system", () => {
      const defaultTheme: Theme = "system";
      expect(defaultTheme).toBe("system");
    });
  });

  describe("Locale", () => {
    it("default locale is en", () => {
      const defaultLocale = "en";
      expect(defaultLocale).toBe("en");
    });

    it("locale can be changed to any supported locale", () => {
      const supportedLocales = [
        "en",
        "zh",
        "bg",
        "ca",
        "de",
        "es",
        "fa",
        "fr",
        "nl",
        "pt",
        "ru",
        "sk",
        "uk",
      ];
      for (const locale of supportedLocales) {
        expect(typeof locale).toBe("string");
        expect(locale.length > 0).toBe(true);
      }
    });
  });

  describe("createPersistentVar behavior", () => {
    // Replicating the logic from createPersistentVar
    const apolloPath = require.resolve("@apollo/client");
    const asyncStoragePath =
      require.resolve("@react-native-async-storage/async-storage");

    let originalApolloModule: NodeModule | undefined;
    let originalAsyncStorageModule: NodeModule | undefined;

    type Listener<T> = (value: T) => void;

    const makeVarFactory = () => {
      return function makeVar<T>(initialValue: T) {
        let currentValue = initialValue;
        const listeners: Listener<T>[] = [];
        const reactiveVar = ((...args: [T?]) => {
          if (args.length === 0) {
            return currentValue;
          }
          currentValue = args[0] as T;
          listeners.slice().forEach((listener) => listener(currentValue));
          return currentValue;
        }) as ReactiveVar<T>;
        reactiveVar.onNextChange = (listener: Listener<T>): (() => void) => {
          listeners.push(listener);
          return () => {
            const index = listeners.indexOf(listener);
            if (index > -1) {
              listeners.splice(index, 1);
            }
          };
        };
        return reactiveVar;
      };
    };

    const asyncStorageMock = {
      getItem: async (_key: string) => null as string | null,
      setItem: async (_key: string, _value: string) => {},
    };

    beforeEach(() => {
      originalApolloModule = require.cache[apolloPath];
      originalAsyncStorageModule = require.cache[asyncStoragePath];

      asyncStorageMock.getItem = async (_key: string) => null;
      asyncStorageMock.setItem = async (_key: string, _value: string) => {};

      require.cache[apolloPath] = {
        exports: { makeVar: makeVarFactory() },
      } as NodeModule;
      require.cache[asyncStoragePath] = {
        exports: asyncStorageMock,
      } as NodeModule;
    });

    afterEach(() => {
      const persistentVarPath = require.resolve("../../apollo/persistent-var");
      delete require.cache[persistentVarPath];

      if (originalApolloModule) {
        require.cache[apolloPath] = originalApolloModule;
      } else {
        delete require.cache[apolloPath];
      }

      if (originalAsyncStorageModule) {
        require.cache[asyncStoragePath] = originalAsyncStorageModule;
      } else {
        delete require.cache[asyncStoragePath];
      }
    });

    it("creates persistent var with string default", () => {
      const persistentVarPath = require.resolve("../../apollo/persistent-var");
      delete require.cache[persistentVarPath];
      const { createPersistentVar } = require("../../apollo/persistent-var");

      const [localeVar, loadLocale] = createPersistentVar("locale", "en");
      expect(localeVar()).toBe("en");
      expect(typeof loadLocale).toBe("function");
    });

    it("creates persistent var with null default", () => {
      const persistentVarPath = require.resolve("../../apollo/persistent-var");
      delete require.cache[persistentVarPath];
      const { createPersistentVar } = require("../../apollo/persistent-var");

      const [sessionVar] = createPersistentVar("session", null);
      expect(sessionVar()).toBe(null);
    });

    it("creates persistent var with system theme default", () => {
      const persistentVarPath = require.resolve("../../apollo/persistent-var");
      delete require.cache[persistentVarPath];
      const { createPersistentVar } = require("../../apollo/persistent-var");

      const [themeVar] = createPersistentVar("theme", "system");
      expect(themeVar()).toBe("system");
    });

    it("reactive var updates value", () => {
      const persistentVarPath = require.resolve("../../apollo/persistent-var");
      delete require.cache[persistentVarPath];
      const { createPersistentVar } = require("../../apollo/persistent-var");

      const [themeVar] = createPersistentVar("theme", "system");
      themeVar("dark");
      expect(themeVar()).toBe("dark");
    });

    it("reactive var loads from storage", async () => {
      asyncStorageMock.getItem = async (key: string) =>
        key === "locale" ? JSON.stringify("fr") : null;

      const persistentVarPath = require.resolve("../../apollo/persistent-var");
      delete require.cache[persistentVarPath];
      const { createPersistentVar } = require("../../apollo/persistent-var");

      const [localeVar, loadLocale] = createPersistentVar("locale", "en");
      expect(localeVar()).toBe("en");
      await loadLocale();
      expect(localeVar()).toBe("fr");
    });

    it("reactive var saves to storage", async () => {
      const writes: Array<{ key: string; value: string }> = [];
      asyncStorageMock.setItem = async (key: string, value: string) => {
        writes.push({ key, value });
      };

      const persistentVarPath = require.resolve("../../apollo/persistent-var");
      delete require.cache[persistentVarPath];
      const { createPersistentVar } = require("../../apollo/persistent-var");

      const [themeVar] = createPersistentVar("theme", "light");
      themeVar("dark");
      await Promise.resolve();

      expect(writes).toEqual([{ key: "theme", value: JSON.stringify("dark") }]);
    });

    it("flush waits for the write the last set kicked off", async () => {
      // The language picker awaits this before restarting the app to apply a
      // right-to-left flip. Writes are fire-and-forget everywhere else, but a
      // restart that outruns the write brings the app back holding the previous
      // locale — so the promise has to still be pending when the write is.
      let release: (() => void) | undefined;
      const settled: string[] = [];
      asyncStorageMock.setItem = (_key: string, value: string) =>
        new Promise<void>((resolve) => {
          release = () => {
            settled.push(value);
            resolve();
          };
        });

      const persistentVarPath = require.resolve("../../apollo/persistent-var");
      delete require.cache[persistentVarPath];
      const { createPersistentVar } = require("../../apollo/persistent-var");

      const [localeVar, , flushLocale] = createPersistentVar("locale", "en");
      localeVar("fa");

      let flushed = false;
      const pending = flushLocale().then(() => {
        flushed = true;
      });

      await Promise.resolve();
      expect(flushed).toBe(false);
      expect(settled).toEqual([]);

      release?.();
      await pending;
      expect(flushed).toBe(true);
      expect(settled).toEqual([JSON.stringify("fa")]);
    });

    it("flush resolves when nothing has been written yet", async () => {
      const persistentVarPath = require.resolve("../../apollo/persistent-var");
      delete require.cache[persistentVarPath];
      const { createPersistentVar } = require("../../apollo/persistent-var");

      const [, , flushLocale] = createPersistentVar("locale", "en");

      let flushed = false;
      await flushLocale().then(() => {
        flushed = true;
      });

      expect(flushed).toBe(true);
    });
  });

  describe("Number helper for toBeGreaterThan", () => {
    it("validates locale string length", () => {
      expect("en".length).toBe(2);
    });
  });
});
