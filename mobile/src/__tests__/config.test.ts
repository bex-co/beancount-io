describe("config", () => {
  describe("config object", () => {
    it("exports config object", () => {
      const { config } = require("../config");
      expect(config).toBeTruthy();
      expect(typeof config).toBe("object");
    });

    it("has project property", () => {
      const { config } = require("../config");
      expect(config.project).toBe("mobile-beancount");
    });

    it("has sentryDsn property", () => {
      const { config } = require("../config");
      expect(typeof config.sentryDsn).toBe("string");
    });

    it("has serverUrl property", () => {
      const { config } = require("../config");
      expect(typeof config.serverUrl).toBe("string");
    });

    it("serverUrl defaults to beancount.io", () => {
      const { config } = require("../config");
      expect(config.serverUrl).toBe("https://beancount.io/");
    });

    it("serverUrl ends with trailing slash", () => {
      const { config } = require("../config");
      expect(config.serverUrl.endsWith("/")).toBe(true);
    });

    it("serverUrl is a valid URL", () => {
      const { config } = require("../config");
      expect(config.serverUrl.startsWith("https://")).toBe(true);
    });
  });

  describe("config structure", () => {
    it("has all required top-level keys", () => {
      const { config } = require("../config");
      const keys = Object.keys(config);
      expect(keys.includes("project")).toBe(true);
      expect(keys.includes("sentryDsn")).toBe(true);
      expect(keys.includes("serverUrl")).toBe(true);
    });

    it("carries no analytics configuration", () => {
      // The Mixpanel wrapper was retired (.pm w3/001): every event went to a
      // dead sink. A token reappearing here means the sink came back with it.
      const { config } = require("../config");
      expect("analytics" in config).toBe(false);
    });
  });
});

describe("agent chat feature flag", () => {
  it("is off", () => {
    // The feature is gated off until approval cards ship (ADR002 P2): it can
    // spend a user's AI quota and cannot yet review its own ledger writes.
    const { config } = require("../config");
    expect(config.features.agentChat).toBeFalsy();
  });

  it("is a plain boolean, not something read from the environment", () => {
    // A constant is visible in the diff of whoever flips it. An env-var switch
    // can turn the feature on in a build because of what was in someone's
    // shell, which is not a thing that should be able to happen quietly.
    const fs = require("fs");
    const path = require("path");
    const source = fs.readFileSync(
      path.join(__dirname, "..", "config.ts"),
      "utf8",
    );
    const features = source.slice(source.indexOf("features:"));
    expect(/agentChat:\s*(true|false)\s*,/.test(features)).toBeTruthy();
    expect(/agentChat:.*process\.env/.test(features)).toBeFalsy();
  });
});
