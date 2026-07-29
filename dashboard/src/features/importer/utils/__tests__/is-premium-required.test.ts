import { describe, it, expect } from "vitest";
import { isPremiumRequired } from "../is-premium-required";

describe("isPremiumRequired", () => {
  describe("GraphQL errors with extensions.code", () => {
    it("should return true for FORBIDDEN error code", () => {
      const error = {
        errors: [
          {
            message: "Access denied",
            extensions: { code: "FORBIDDEN" },
          },
        ],
      };

      expect(isPremiumRequired(error)).toBe(true);
    });

    it("should return true for PREMIUM_REQUIRED error code", () => {
      const error = {
        errors: [
          {
            message: "Premium access required",
            extensions: { code: "PREMIUM_REQUIRED" },
          },
        ],
      };

      expect(isPremiumRequired(error)).toBe(true);
    });

    it("should return true for SUBSCRIPTION_REQUIRED error code", () => {
      const error = {
        errors: [
          {
            message: "Subscription required",
            extensions: { code: "SUBSCRIPTION_REQUIRED" },
          },
        ],
      };

      expect(isPremiumRequired(error)).toBe(true);
    });

    it("should return true for PAYMENT_REQUIRED error code", () => {
      const error = {
        errors: [
          {
            message: "Payment required",
            extensions: { code: "PAYMENT_REQUIRED" },
          },
        ],
      };

      expect(isPremiumRequired(error)).toBe(true);
    });

    it("should return true for TIER_UPGRADE_REQUIRED error code", () => {
      const error = {
        errors: [
          {
            message: "Tier upgrade required",
            extensions: { code: "TIER_UPGRADE_REQUIRED" },
          },
        ],
      };

      expect(isPremiumRequired(error)).toBe(true);
    });

    it("should return false for non-premium error codes", () => {
      const error = {
        errors: [
          {
            message: "Unauthorized",
            extensions: { code: "UNAUTHENTICATED" },
          },
        ],
      };

      expect(isPremiumRequired(error)).toBe(false);
    });

    it("should return false for errors without extensions", () => {
      const error = {
        errors: [
          {
            message: "Some error",
          },
        ],
      };

      expect(isPremiumRequired(error)).toBe(false);
    });

    it("should return true if any error in the array has premium code", () => {
      const error = {
        errors: [
          {
            message: "Some error",
            extensions: { code: "INTERNAL_ERROR" },
          },
          {
            message: "Premium required",
            extensions: { code: "PREMIUM_REQUIRED" },
          },
          {
            message: "Another error",
            extensions: { code: "BAD_REQUEST" },
          },
        ],
      };

      expect(isPremiumRequired(error)).toBe(true);
    });
  });

  describe("Fallback to message checking", () => {
    it("should return true for Error with 'premium' in message", () => {
      const error = new Error("This is a premium feature");
      expect(isPremiumRequired(error)).toBe(true);
    });

    it("should return true for Error with 'subscription' in message", () => {
      const error = new Error("Subscription required to access");
      expect(isPremiumRequired(error)).toBe(true);
    });

    it("should return true for Error with 'paid' in message", () => {
      const error = new Error("This is a paid feature");
      expect(isPremiumRequired(error)).toBe(true);
    });

    it("should return true for Error with 'tier' in message", () => {
      const error = new Error("Upgrade your tier");
      expect(isPremiumRequired(error)).toBe(true);
    });

    it("should return true for Error with 'access denied' in message", () => {
      const error = new Error("Access denied to this feature");
      expect(isPremiumRequired(error)).toBe(true);
    });

    it("should return true for Error with 'forbidden' in message", () => {
      const error = new Error("Forbidden resource");
      expect(isPremiumRequired(error)).toBe(true);
    });

    it("should return true for Error with 'upgrade' in message", () => {
      const error = new Error("Please upgrade your account");
      expect(isPremiumRequired(error)).toBe(true);
    });

    it("should be case-insensitive for message checking", () => {
      const error = new Error("PREMIUM feature required");
      expect(isPremiumRequired(error)).toBe(true);
    });

    it("should return false for Error without premium keywords", () => {
      const error = new Error("Network error");
      expect(isPremiumRequired(error)).toBe(false);
    });
  });

  describe("Edge cases", () => {
    it("should return false for null", () => {
      expect(isPremiumRequired(null)).toBe(false);
    });

    it("should return false for undefined", () => {
      expect(isPremiumRequired(undefined)).toBe(false);
    });

    it("should return false for empty string", () => {
      expect(isPremiumRequired("")).toBe(false);
    });

    it("should handle string errors with premium keywords", () => {
      expect(isPremiumRequired("premium feature required")).toBe(true);
    });

    it("should return false for non-error objects", () => {
      expect(isPremiumRequired({ foo: "bar" })).toBe(false);
    });

    it("should return false for numbers", () => {
      expect(isPremiumRequired(123)).toBe(false);
    });
  });

  describe("GraphQL errors with message fallback", () => {
    it("should fall back to message checking for GraphQL errors without premium code", () => {
      const error = {
        errors: [
          {
            message: "This requires a premium subscription",
            extensions: { code: "BAD_REQUEST" },
          },
        ],
      };

      expect(isPremiumRequired(error)).toBe(true);
    });

    it("should prioritize extensions.code over message", () => {
      const error = {
        errors: [
          {
            message: "Premium subscription required",
            extensions: { code: "FORBIDDEN" },
          },
        ],
      };

      // Should return true because of FORBIDDEN code, not just message
      expect(isPremiumRequired(error)).toBe(true);
    });
  });
});
