import { config } from "../../config";

type HeadersType = typeof import("../request").headers;
type GetEndpointType = typeof import("../request").getEndpoint;

describe("request utilities", () => {
  let headers: HeadersType;
  let getEndpoint: GetEndpointType;
  let restoreResolveFilename: (() => void) | undefined;
  let selectedServerUrl = "https://beancount.io/";
  let originalServerUrlVarModule: NodeModule | undefined;

  beforeAll(() => {
    const Module = require("module");
    const originalResolveFilename = Module._resolveFilename;
    const configPath = require.resolve("../../config");
    const serverUrlPath = require.resolve("../server-url");
    const serverUrlVarPath = require.resolve("../vars/server-url");
    originalServerUrlVarModule = require.cache[serverUrlVarPath];
    require.cache[serverUrlVarPath] = {
      exports: { getServerUrl: () => selectedServerUrl },
    } as NodeModule;
    Module._resolveFilename = function patch(
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
      return originalResolveFilename.call(
        this,
        request,
        parent,
        isMain,
        options,
      );
    };
    restoreResolveFilename = () => {
      Module._resolveFilename = originalResolveFilename;
    };

    const constantsPath = require.resolve("expo-constants");
    require.cache[constantsPath] = {
      exports: { nativeAppVersion: "9.9.9" },
    } as NodeModule;

    const modulePath = require.resolve("../request");
    delete require.cache[modulePath];
    ({ headers, getEndpoint } = require("../request"));
  });

  afterAll(() => {
    const constantsPath = require.resolve("expo-constants");
    delete require.cache[constantsPath];

    const modulePath = require.resolve("../request");
    delete require.cache[modulePath];

    const serverUrlVarPath = require.resolve("../vars/server-url");
    if (originalServerUrlVarModule) {
      require.cache[serverUrlVarPath] = originalServerUrlVarModule;
    } else {
      delete require.cache[serverUrlVarPath];
    }

    restoreResolveFilename?.();
  });

  it("includes the app id and version headers", () => {
    expect(headers["x-app-id"]).toBe(config.project);
    expect(headers["x-app-version"]).toBe("9.9.9");
  });

  it("combines the server URL with the provided path", () => {
    expect(getEndpoint("api/data")).toBe("https://beancount.io/api/data");
    expect(getEndpoint("/users")).toBe("https://beancount.io/users");
  });

  it("uses the currently selected server and preserves a path prefix", () => {
    selectedServerUrl = "https://ledger.example.com/beancount/";
    expect(getEndpoint("api-gateway/")).toBe(
      "https://ledger.example.com/beancount/api-gateway/",
    );
  });
});
