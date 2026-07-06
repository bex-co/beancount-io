import path from "path";

describe("utility modules", () => {
  describe("currency-util", () => {
    const currencyIconsPath = require.resolve("currency-icons");
    const modulePath = require.resolve("../currency-util");
    let originalCurrencyIcons: NodeModule | undefined;

    beforeEach(() => {
      originalCurrencyIcons = require.cache[currencyIconsPath];
      require.cache[currencyIconsPath] = {
        exports: {
          __esModule: true,
          default: {
            USD: { symbol: "$" },
            EUR: { symbol: "€" },
          },
        },
      } as NodeModule;
      delete require.cache[modulePath];
    });

    afterEach(() => {
      delete require.cache[modulePath];
      if (originalCurrencyIcons) {
        require.cache[currencyIconsPath] = originalCurrencyIcons;
      } else {
        delete require.cache[currencyIconsPath];
      }
    });

    it("returns the Yuan symbol explicitly", () => {
      const { getCurrencySymbol } = require("../currency-util");
      expect(getCurrencySymbol("CNY")).toBe("¥");
    });

    it("looks up symbols from the currency icon table", () => {
      const { getCurrencySymbol } = require("../currency-util");
      expect(getCurrencySymbol("EUR")).toBe("€");
    });

    it("falls back to an empty string when unknown", () => {
      const { getCurrencySymbol } = require("../currency-util");
      expect(getCurrencySymbol("ZZZ")).toBe("");
    });
  });

  describe("format-util", () => {
    it("formats dates using yyyy-mm-dd", () => {
      const { getFormatDate } = require("../format-util");
      const formatted = getFormatDate(new Date("2024-01-05T10:20:30Z"));
      expect(formatted).toBe("2024-01-05");
    });
  });

  describe("number-utils", () => {
    it("keeps a single decimal place for numbers below one thousand", () => {
      const { shortNumber } = require("../number-utils");
      expect(shortNumber(12)).toBe("12.0");
      expect(shortNumber("18.5")).toBe("18.5");
    });

    it("adds suffixes for large magnitudes", () => {
      const { shortNumber } = require("../number-utils");
      expect(shortNumber(1200)).toBe("1.2K");
      expect(shortNumber(2500000)).toBe("2.5M");
      expect(shortNumber(7500000000)).toBe("7.5B");
    });

    it("preserves sign and omits decimals for whole results", () => {
      const { shortNumber } = require("../number-utils");
      expect(shortNumber(-3000000)).toBe("-3M");
    });

    it("returns the original string when parsing fails", () => {
      const { shortNumber } = require("../number-utils");
      expect(shortNumber("not-a-number")).toBe("not-a-number");
    });
  });

  describe("session-utils", () => {
    const jwtDecodePath = require.resolve("jwt-decode");
    const sessionUtilsPath = require.resolve("../session-utils");
    let originalJwtDecode: NodeModule | undefined;

    beforeEach(() => {
      originalJwtDecode = require.cache[jwtDecodePath];
      require.cache[jwtDecodePath] = {
        exports: {
          __esModule: true,
          jwtDecode: (token: string) => ({ sub: `${token}-subject` }),
        },
      } as NodeModule;
      delete require.cache[sessionUtilsPath];
    });

    afterEach(() => {
      delete require.cache[sessionUtilsPath];
      if (originalJwtDecode) {
        require.cache[jwtDecodePath] = originalJwtDecode;
      } else {
        delete require.cache[jwtDecodePath];
      }
    });

    it("derives a session object from the JWT subject", () => {
      const { createSession } = require("../session-utils");
      const token = "abc.def";
      const session = createSession(token);
      expect(session).toEqual({ userId: `${token}-subject`, authToken: token });
    });
  });

  describe("request helpers", () => {
    const Module = require("module");
    const configPath = path.resolve(__dirname, "../../config.ts");
    let restoreResolve: (() => void) | undefined;
    const constantsPath = require.resolve("expo-constants");
    let originalConstants: NodeModule | undefined;

    beforeAll(() => {
      const originalResolve = Module._resolveFilename;
      Module._resolveFilename = function patched(
        request: string,
        parent: NodeModule | null | undefined,
        isMain: boolean,
        options?: { paths?: string[] },
      ) {
        if (request === "@/config") {
          return configPath;
        }
        return originalResolve.call(this, request, parent, isMain, options);
      };
      restoreResolve = () => {
        Module._resolveFilename = originalResolve;
      };
    });

    afterAll(() => {
      restoreResolve?.();
    });

    beforeEach(() => {
      originalConstants = require.cache[constantsPath];
      require.cache[constantsPath] = {
        exports: {
          default: { nativeAppVersion: "9.9.9" },
          nativeAppVersion: "9.9.9",
        },
      } as NodeModule;
      delete require.cache[require.resolve("../request")];
    });

    afterEach(() => {
      delete require.cache[require.resolve("../request")];
      if (originalConstants) {
        require.cache[constantsPath] = originalConstants;
      } else {
        delete require.cache[constantsPath];
      }
    });

    it("exposes default headers including the current app version", () => {
      const { headers } = require("../request");
      const { config } = require("../../config");
      expect(headers["x-app-id"]).toBe(config.project);
      expect(headers["x-app-version"]).toBe("9.9.9");
    });

    it("builds absolute endpoints from relative paths", () => {
      const { getEndpoint } = require("../request");
      const { config } = require("../../config");
      expect(getEndpoint("api/test/")).toBe(`${config.serverUrl}api/test/`);
    });
  });

  describe("global function factory", () => {
    const factoryPath = require.resolve("../globalFnFactory");

    afterEach(() => {
      delete require.cache[factoryPath];
    });

    it("stores, retrieves, and deletes global callbacks", () => {
      const {
        SelectedAssets,
        SelectedCurrency,
        getGlobalFn,
      } = require("../globalFnFactory");

      const assetsFn = (value: string) => value.toUpperCase();
      expect(SelectedAssets.hasFn()).toBe(false);

      SelectedAssets.setFn(assetsFn);
      expect(SelectedAssets.hasFn()).toBe(true);
      expect(SelectedAssets.getFn()).toBe(assetsFn);
      expect(getGlobalFn("SelectedAssets")).toBe(assetsFn);

      const currencyFn = (value: string) => `currency:${value}`;
      SelectedCurrency.setFn(currencyFn);
      expect(getGlobalFn("SelectedCurrency")).toBe(currencyFn);

      SelectedAssets.deleteFn();
      expect(SelectedAssets.hasFn()).toBe(false);
      expect(getGlobalFn("SelectedAssets")).toBe(undefined);
    });
  });
});
