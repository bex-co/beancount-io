import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  getStripePlanConfig,
  getStripePlanConfigFromUrl,
  stripePlanConfig,
  type StripeEnvironment,
  type StripePlanConfig,
} from "../stripe-config";

describe("stripe-config", () => {
  describe("getStripePlanConfig", () => {
    it("should return production config by default", () => {
      const config = getStripePlanConfig();

      expect(config.environment).toBe("production");
      expect(config.clientId).toBe("beancount-web-prod");
      expect(config.monthly).toBe("price_1RrSOGEqsEqs2tLVFnyB34qG");
      expect(config.yearly).toBe("price_1L9ccEEqsEqs2tLVbeBgHm9p");
    });

    it("should return production config when env is production", () => {
      const config = getStripePlanConfig("production");

      expect(config.environment).toBe("production");
      expect(config.clientId).toBe("beancount-web-prod");
    });

    it("should return development config when env is development", () => {
      const config = getStripePlanConfig("development");

      expect(config.environment).toBe("development");
      expect(config.clientId).toBe("beancount-web-dev");
      expect(config.monthly).toBe("price_1RrSU7EqsEqs2tLVCQiyqgQy");
      expect(config.yearly).toBe("price_1L9cmbEqsEqs2tLVsGOgOQYg");
    });

    it("should return production config when env is null", () => {
      const config = getStripePlanConfig(null);

      expect(config.environment).toBe("production");
    });

    it("should return production config when env is undefined", () => {
      const config = getStripePlanConfig(undefined);

      expect(config.environment).toBe("production");
    });

    it("should return production config for invalid environment", () => {
      const config = getStripePlanConfig(
        "invalid" as unknown as StripeEnvironment,
      );

      expect(config.environment).toBe("production");
    });

    it("should have all required fields in production config", () => {
      const config = getStripePlanConfig("production");

      expect(config).toHaveProperty("clientId");
      expect(config).toHaveProperty("monthly");
      expect(config).toHaveProperty("yearly");
      expect(config).toHaveProperty("environment");
    });

    it("should have all required fields in development config", () => {
      const config = getStripePlanConfig("development");

      expect(config).toHaveProperty("clientId");
      expect(config).toHaveProperty("monthly");
      expect(config).toHaveProperty("yearly");
      expect(config).toHaveProperty("environment");
    });
  });

  describe("getStripePlanConfigFromUrl", () => {
    const originalWindow = global.window;
    let mockLocation: { search: string };

    beforeEach(() => {
      mockLocation = { search: "" };
      Object.defineProperty(global, "window", {
        value: {
          location: mockLocation,
        },
        writable: true,
        configurable: true,
      });
    });

    afterEach(() => {
      if (originalWindow) {
        Object.defineProperty(global, "window", {
          value: originalWindow,
          writable: true,
          configurable: true,
        });
      }
    });

    it("should return production config when no env param is present", () => {
      mockLocation.search = "";

      const config = getStripePlanConfigFromUrl();

      expect(config.environment).toBe("production");
    });

    it("should return development config when env=dev", () => {
      mockLocation.search = "?env=dev";

      const config = getStripePlanConfigFromUrl();

      expect(config.environment).toBe("development");
    });

    it("should return production config when env param is not dev", () => {
      mockLocation.search = "?env=prod";

      const config = getStripePlanConfigFromUrl();

      expect(config.environment).toBe("production");
    });

    it("should handle multiple query params with env=dev", () => {
      mockLocation.search = "?foo=bar&env=dev&baz=qux";

      const config = getStripePlanConfigFromUrl();

      expect(config.environment).toBe("development");
    });

    it("should handle multiple query params without env param", () => {
      mockLocation.search = "?foo=bar&baz=qux";

      const config = getStripePlanConfigFromUrl();

      expect(config.environment).toBe("production");
    });

    it("should return production config when window is undefined (SSR)", () => {
      // Temporarily remove window to simulate SSR
      const windowBackup = global.window;
      // @ts-expect-error Testing SSR scenario where window is undefined
      delete global.window;

      const config = getStripePlanConfigFromUrl();

      expect(config.environment).toBe("production");

      // Restore window
      Object.defineProperty(global, "window", {
        value: windowBackup,
        writable: true,
        configurable: true,
      });
    });
  });

  describe("stripePlanConfig (deprecated constant)", () => {
    it("should be defined as production config", () => {
      expect(stripePlanConfig).toBeDefined();
      expect(stripePlanConfig.environment).toBe("production");
    });

    it("should have the same values as production config", () => {
      const productionConfig = getStripePlanConfig("production");

      expect(stripePlanConfig.clientId).toBe(productionConfig.clientId);
      expect(stripePlanConfig.monthly).toBe(productionConfig.monthly);
      expect(stripePlanConfig.yearly).toBe(productionConfig.yearly);
      expect(stripePlanConfig.environment).toBe(productionConfig.environment);
    });
  });

  describe("Type definitions", () => {
    it("should type StripeEnvironment correctly", () => {
      const env1: StripeEnvironment = "production";
      const env2: StripeEnvironment = "development";

      expect(["production", "development"]).toContain(env1);
      expect(["production", "development"]).toContain(env2);
    });

    it("should type StripePlanConfig correctly", () => {
      const config: StripePlanConfig = {
        clientId: "test-client",
        monthly: "price_monthly",
        yearly: "price_yearly",
        environment: "production",
      };

      expect(config.clientId).toBe("test-client");
      expect(config.monthly).toBe("price_monthly");
      expect(config.yearly).toBe("price_yearly");
      expect(config.environment).toBe("production");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty string env parameter", () => {
      const config = getStripePlanConfig("" as StripeEnvironment);

      expect(config.environment).toBe("production");
    });

    it("should be case-sensitive for env parameter", () => {
      const config = getStripePlanConfig(
        "Development" as unknown as StripeEnvironment,
      );

      expect(config.environment).toBe("production");
    });

    it("should return consistent results across multiple calls", () => {
      const config1 = getStripePlanConfig("production");
      const config2 = getStripePlanConfig("production");

      expect(config1.clientId).toBe(config2.clientId);
      expect(config1.monthly).toBe(config2.monthly);
      expect(config1.yearly).toBe(config2.yearly);
    });
  });
});
