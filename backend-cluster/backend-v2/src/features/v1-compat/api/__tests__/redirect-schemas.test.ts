import {
  ledgerEditorRedirectSchema,
  ledgerEditorErrorSchema,
} from "../redirect-schemas";

describe("Legacy Schemas", () => {
  describe("ledgerEditorRedirectSchema", () => {
    it("should accept valid redirect URL", () => {
      const result = ledgerEditorRedirectSchema.safeParse({
        location:
          "https://beancount.io/auth?oneTimeToken=507f1f77bcf86cd799439011",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.location).toBe(
          "https://beancount.io/auth?oneTimeToken=507f1f77bcf86cd799439011",
        );
      }
    });

    it("should accept localhost URL", () => {
      const result = ledgerEditorRedirectSchema.safeParse({
        location: "http://localhost:3000/auth?token=abc",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid URL", () => {
      const result = ledgerEditorRedirectSchema.safeParse({
        location: "not-a-url",
      });
      expect(result.success).toBe(false);
    });

    it("should require location", () => {
      const result = ledgerEditorRedirectSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("should reject non-string location", () => {
      const result = ledgerEditorRedirectSchema.safeParse({
        location: 123,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("ledgerEditorErrorSchema", () => {
    it("should accept valid error message", () => {
      const result = ledgerEditorErrorSchema.safeParse({
        message: "token not found",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.message).toBe("token not found");
      }
    });

    it("should require message", () => {
      const result = ledgerEditorErrorSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("should reject non-string message", () => {
      const result = ledgerEditorErrorSchema.safeParse({
        message: 404,
      });
      expect(result.success).toBe(false);
    });

    it("should accept empty message", () => {
      const result = ledgerEditorErrorSchema.safeParse({
        message: "",
      });
      expect(result.success).toBe(true);
    });

    it("should accept long error message", () => {
      const result = ledgerEditorErrorSchema.safeParse({
        message:
          "This is a very long error message that describes what went wrong in detail",
      });
      expect(result.success).toBe(true);
    });
  });
});
