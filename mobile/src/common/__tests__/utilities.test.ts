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

  describe("request helpers", () => {
    const Module = require("module");
    const configPath = path.resolve(__dirname, "../../config.ts");
    const serverUrlPath = path.resolve(__dirname, "../server-url.ts");
    const serverUrlVarPath = path.resolve(__dirname, "../vars/server-url.ts");
    let restoreResolve: (() => void) | undefined;
    const constantsPath = require.resolve("expo-constants");
    let originalConstants: NodeModule | undefined;
    let originalServerUrlVar: NodeModule | undefined;

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
        if (request === "@/common/server-url") {
          return serverUrlPath;
        }
        if (request === "@/common/vars/server-url") {
          return serverUrlVarPath;
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
      originalServerUrlVar = require.cache[serverUrlVarPath];
      require.cache[constantsPath] = {
        exports: {
          default: { nativeAppVersion: "9.9.9" },
          nativeAppVersion: "9.9.9",
        },
      } as NodeModule;
      require.cache[serverUrlVarPath] = {
        exports: {
          getServerUrl: () => require("../../config").config.serverUrl,
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
      if (originalServerUrlVar) {
        require.cache[serverUrlVarPath] = originalServerUrlVar;
      } else {
        delete require.cache[serverUrlVarPath];
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
        SelectedAccount,
        SelectedCurrency,
        getGlobalFn,
      } = require("../globalFnFactory");

      const assetsFn = (value: string) => value.toUpperCase();
      expect(SelectedAccount.hasFn()).toBe(false);

      SelectedAccount.setFn(assetsFn);
      expect(SelectedAccount.hasFn()).toBe(true);
      expect(SelectedAccount.getFn()).toBe(assetsFn);
      expect(getGlobalFn("SelectedAccount")).toBe(assetsFn);

      const currencyFn = (value: string) => `currency:${value}`;
      SelectedCurrency.setFn(currencyFn);
      expect(getGlobalFn("SelectedCurrency")).toBe(currencyFn);

      SelectedAccount.deleteFn();
      expect(SelectedAccount.hasFn()).toBe(false);
      expect(getGlobalFn("SelectedAccount")).toBe(undefined);
    });
  });
});
