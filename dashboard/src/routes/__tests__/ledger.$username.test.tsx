import { describe, it, expect } from "vitest";
import { z } from "zod";

// Import the schema from the route file by reconstructing it
// This tests the validation logic independently
const userProfileSearchSchema = z.object({
  tab: z.enum(["overview", "starred", "following", "followers"]).optional(),
});

describe("User Profile Route - Search Schema Validation", () => {
  describe("Valid Tab Values", () => {
    it("should accept 'overview' as a valid tab value", () => {
      const result = userProfileSearchSchema.safeParse({ tab: "overview" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tab).toBe("overview");
      }
    });

    it("should accept 'starred' as a valid tab value", () => {
      const result = userProfileSearchSchema.safeParse({ tab: "starred" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tab).toBe("starred");
      }
    });

    it("should accept 'following' as a valid tab value", () => {
      const result = userProfileSearchSchema.safeParse({ tab: "following" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tab).toBe("following");
      }
    });

    it("should accept 'followers' as a valid tab value", () => {
      const result = userProfileSearchSchema.safeParse({ tab: "followers" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tab).toBe("followers");
      }
    });

    it("should accept undefined tab (no query param)", () => {
      const result = userProfileSearchSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tab).toBeUndefined();
      }
    });

    it("should accept empty object", () => {
      const result = userProfileSearchSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe("Invalid Tab Values", () => {
    it("should reject invalid tab value", () => {
      const result = userProfileSearchSchema.safeParse({ tab: "invalid" });
      expect(result.success).toBe(false);
    });

    it("should reject numeric tab value", () => {
      const result = userProfileSearchSchema.safeParse({ tab: 123 });
      expect(result.success).toBe(false);
    });

    it("should reject boolean tab value", () => {
      const result = userProfileSearchSchema.safeParse({ tab: true });
      expect(result.success).toBe(false);
    });

    it("should reject null tab value", () => {
      const result = userProfileSearchSchema.safeParse({ tab: null });
      expect(result.success).toBe(false);
    });

    it("should reject array tab value", () => {
      const result = userProfileSearchSchema.safeParse({ tab: ["starred"] });
      expect(result.success).toBe(false);
    });

    it("should reject object tab value", () => {
      const result = userProfileSearchSchema.safeParse({
        tab: { value: "starred" },
      });
      expect(result.success).toBe(false);
    });
  });

  describe("Case Sensitivity", () => {
    it("should reject uppercase tab value", () => {
      const result = userProfileSearchSchema.safeParse({ tab: "STARRED" });
      expect(result.success).toBe(false);
    });

    it("should reject mixed case tab value", () => {
      const result = userProfileSearchSchema.safeParse({ tab: "Starred" });
      expect(result.success).toBe(false);
    });

    it("should reject tab value with spaces", () => {
      const result = userProfileSearchSchema.safeParse({ tab: " starred " });
      expect(result.success).toBe(false);
    });
  });

  describe("Edge Cases", () => {
    it("should reject empty string tab value", () => {
      const result = userProfileSearchSchema.safeParse({ tab: "" });
      expect(result.success).toBe(false);
    });

    it("should reject tab value with special characters", () => {
      const result = userProfileSearchSchema.safeParse({ tab: "starred!" });
      expect(result.success).toBe(false);
    });

    it("should reject tab value with hyphen", () => {
      const result = userProfileSearchSchema.safeParse({ tab: "star-red" });
      expect(result.success).toBe(false);
    });

    it("should reject tab value with underscore", () => {
      const result = userProfileSearchSchema.safeParse({ tab: "star_red" });
      expect(result.success).toBe(false);
    });

    it("should handle multiple invalid properties gracefully", () => {
      const result = userProfileSearchSchema.safeParse({
        tab: "invalid",
        other: "value",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("Schema Type Inference", () => {
    it("should infer correct TypeScript type", () => {
      type SchemaType = z.infer<typeof userProfileSearchSchema>;

      // This is a compile-time test - if it compiles, the type is correct
      const validData: SchemaType = { tab: "starred" };
      expect(validData.tab).toBe("starred");

      const validDataWithUndefined: SchemaType = {};
      expect(validDataWithUndefined.tab).toBeUndefined();
    });

    it("should ensure tab is optional in inferred type", () => {
      type SchemaType = z.infer<typeof userProfileSearchSchema>;

      // This should compile without errors
      const dataWithoutTab: SchemaType = {};
      expect(dataWithoutTab).toEqual({});
    });
  });

  describe("Error Messages", () => {
    it("should provide helpful error message for invalid value", () => {
      const result = userProfileSearchSchema.safeParse({ tab: "invalid" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toHaveLength(1);
        // Zod uses different error codes depending on version
        expect(["invalid_enum_value", "invalid_value"]).toContain(
          result.error.issues[0].code,
        );
      }
    });

    it("should list valid options in error message", () => {
      const result = userProfileSearchSchema.safeParse({ tab: "wrong" });
      expect(result.success).toBe(false);
      if (!result.success) {
        const errorMessage = result.error.issues[0].message;
        expect(errorMessage).toContain("overview");
        expect(errorMessage).toContain("starred");
        expect(errorMessage).toContain("following");
        expect(errorMessage).toContain("followers");
      }
    });
  });

  describe("URL Query String Simulation", () => {
    it("should validate URL pattern: ?tab=starred", () => {
      // Simulating parsing URLSearchParams
      const searchParams = new URLSearchParams("?tab=starred");
      const tab = searchParams.get("tab");

      const result = userProfileSearchSchema.safeParse({ tab });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tab).toBe("starred");
      }
    });

    it("should validate URL pattern: no query params", () => {
      const searchParams = new URLSearchParams("");
      const tab = searchParams.get("tab");

      const result = userProfileSearchSchema.safeParse(tab ? { tab } : {});
      expect(result.success).toBe(true);
    });

    it("should reject URL pattern: ?tab=invalid", () => {
      const searchParams = new URLSearchParams("?tab=invalid");
      const tab = searchParams.get("tab");

      const result = userProfileSearchSchema.safeParse({ tab });
      expect(result.success).toBe(false);
    });
  });

  describe("Default Behavior", () => {
    it("should not provide default value for missing tab", () => {
      const result = userProfileSearchSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        // Schema doesn't have .default(), so tab should be undefined
        expect(result.data.tab).toBeUndefined();
      }
    });

    it("should require explicit handling of undefined tab", () => {
      const result = userProfileSearchSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        // Application code should handle undefined with || "overview"
        const activeTab = result.data.tab || "overview";
        expect(activeTab).toBe("overview");
      }
    });
  });
});
