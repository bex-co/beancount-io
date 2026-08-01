import { describe, it, expect } from "vitest";
import { z } from "zod";

// Define the search schemas as they appear in the route files
// These are extracted to test the validation logic independently

const authSearchSchema = z.object({
  oneTimeToken: z.string().optional(),
  next: z.string().optional(),
});

const loginSearchSchema = z.object({
  next: z.string().optional(),
});

const signUpOtpSearchSchema = z.object({
  sessionId: z.string(),
  email: z.string().optional(),
});

const signUpSearchSchema = z.object({
  withDefaultLedger: z.boolean().optional(),
  src: z.string().optional(),
  by: z.string().optional(),
});

const filesSearchSchema = z.object({
  type: z.enum(["file", "dir"]).default("dir"),
  path: z.string().default(""),
  editMode: z.boolean().optional(),
  lineNumber: z.number().optional(),
});

const routeCreateSearchSchema = z.object({
  dirPath: z.string().default(""),
});

const routeUploadSearchSchema = z.object({
  dirPath: z.string().default(""),
});

describe("Route Search Schema Validation", () => {
  describe("authSearchSchema (auth.callback)", () => {
    it("should accept valid oneTimeToken", () => {
      const result = authSearchSchema.parse({
        oneTimeToken: "abc123",
      });
      expect(result.oneTimeToken).toBe("abc123");
    });

    it("should accept valid next parameter", () => {
      const result = authSearchSchema.parse({
        next: "/dashboard",
      });
      expect(result.next).toBe("/dashboard");
    });

    it("should accept both parameters", () => {
      const result = authSearchSchema.parse({
        oneTimeToken: "token123",
        next: "/ledger",
      });
      expect(result.oneTimeToken).toBe("token123");
      expect(result.next).toBe("/ledger");
    });

    it("should accept empty object", () => {
      const result = authSearchSchema.parse({});
      expect(result.oneTimeToken).toBeUndefined();
      expect(result.next).toBeUndefined();
    });

    it("should strip unknown properties", () => {
      const result = authSearchSchema.parse({
        oneTimeToken: "token",
        unknown: "value",
      });
      expect(result.oneTimeToken).toBe("token");
      expect("unknown" in result).toBe(false);
    });
  });

  describe("loginSearchSchema (auth.login)", () => {
    it("should accept valid next parameter", () => {
      const result = loginSearchSchema.parse({
        next: "/settings",
      });
      expect(result.next).toBe("/settings");
    });

    it("should accept empty object", () => {
      const result = loginSearchSchema.parse({});
      expect(result.next).toBeUndefined();
    });

    it("should handle various path formats", () => {
      const paths = [
        "/",
        "/ledger",
        "/ledger/owner/name",
        "/settings/general",
        "/ledger/owner/name/overview?filter=active",
      ];

      paths.forEach((path) => {
        const result = loginSearchSchema.parse({ next: path });
        expect(result.next).toBe(path);
      });
    });
  });

  describe("signUpOtpSearchSchema (auth.sign-up-otp)", () => {
    it("should accept valid sessionId", () => {
      const result = signUpOtpSearchSchema.parse({
        sessionId: "session-123",
      });
      expect(result.sessionId).toBe("session-123");
    });

    it("should accept sessionId with email", () => {
      const result = signUpOtpSearchSchema.parse({
        sessionId: "session-456",
        email: "user@example.com",
      });
      expect(result.sessionId).toBe("session-456");
      expect(result.email).toBe("user@example.com");
    });

    it("should require sessionId", () => {
      expect(() => signUpOtpSearchSchema.parse({})).toThrow();
    });

    it("should require sessionId to be a string", () => {
      expect(() => signUpOtpSearchSchema.parse({ sessionId: 123 })).toThrow();
    });

    it("should allow email to be optional", () => {
      const result = signUpOtpSearchSchema.parse({
        sessionId: "session-789",
      });
      expect(result.sessionId).toBe("session-789");
      expect(result.email).toBeUndefined();
    });
  });

  describe("signUpSearchSchema (auth.sign-up)", () => {
    it("should accept withDefaultLedger true", () => {
      const result = signUpSearchSchema.parse({
        withDefaultLedger: true,
      });
      expect(result.withDefaultLedger).toBe(true);
    });

    it("should accept withDefaultLedger false", () => {
      const result = signUpSearchSchema.parse({
        withDefaultLedger: false,
      });
      expect(result.withDefaultLedger).toBe(false);
    });

    it("should accept empty object", () => {
      const result = signUpSearchSchema.parse({});
      expect(result.withDefaultLedger).toBeUndefined();
    });

    it("should preserve referral attribution", () => {
      const result = signUpSearchSchema.parse({
        src: "ios",
        by: "referrer-123",
      });
      expect(result.src).toBe("ios");
      expect(result.by).toBe("referrer-123");
    });

    it("should reject non-boolean withDefaultLedger", () => {
      expect(() =>
        signUpSearchSchema.parse({ withDefaultLedger: "true" }),
      ).toThrow();
    });
  });

  describe("filesSearchSchema (files.content)", () => {
    it("should use default values when no params provided", () => {
      const result = filesSearchSchema.parse({});
      expect(result.type).toBe("dir");
      expect(result.path).toBe("");
      expect(result.editMode).toBeUndefined();
      expect(result.lineNumber).toBeUndefined();
    });

    it("should accept type as file", () => {
      const result = filesSearchSchema.parse({ type: "file" });
      expect(result.type).toBe("file");
    });

    it("should accept type as dir", () => {
      const result = filesSearchSchema.parse({ type: "dir" });
      expect(result.type).toBe("dir");
    });

    it("should reject invalid type", () => {
      expect(() => filesSearchSchema.parse({ type: "folder" })).toThrow();
    });

    it("should accept valid path", () => {
      const result = filesSearchSchema.parse({
        path: "/src/main.beancount",
      });
      expect(result.path).toBe("/src/main.beancount");
    });

    it("should accept editMode boolean", () => {
      const result = filesSearchSchema.parse({ editMode: true });
      expect(result.editMode).toBe(true);
    });

    it("should accept lineNumber", () => {
      const result = filesSearchSchema.parse({ lineNumber: 42 });
      expect(result.lineNumber).toBe(42);
    });

    it("should accept all parameters together", () => {
      const result = filesSearchSchema.parse({
        type: "file",
        path: "/main.beancount",
        editMode: true,
        lineNumber: 100,
      });
      expect(result.type).toBe("file");
      expect(result.path).toBe("/main.beancount");
      expect(result.editMode).toBe(true);
      expect(result.lineNumber).toBe(100);
    });

    it("should reject non-number lineNumber", () => {
      expect(() =>
        filesSearchSchema.parse({ lineNumber: "forty-two" }),
      ).toThrow();
    });
  });

  describe("routeCreateSearchSchema (files.create)", () => {
    it("should use default empty string for dirPath", () => {
      const result = routeCreateSearchSchema.parse({});
      expect(result.dirPath).toBe("");
    });

    it("should accept valid dirPath", () => {
      const result = routeCreateSearchSchema.parse({
        dirPath: "/accounts/",
      });
      expect(result.dirPath).toBe("/accounts/");
    });

    it("should accept various path formats", () => {
      const paths = ["", "/", "/src", "/src/accounts/", "relative/path"];

      paths.forEach((path) => {
        const result = routeCreateSearchSchema.parse({ dirPath: path });
        expect(result.dirPath).toBe(path);
      });
    });
  });

  describe("routeUploadSearchSchema (files.upload)", () => {
    it("should use default empty string for dirPath", () => {
      const result = routeUploadSearchSchema.parse({});
      expect(result.dirPath).toBe("");
    });

    it("should accept valid dirPath", () => {
      const result = routeUploadSearchSchema.parse({
        dirPath: "/documents/",
      });
      expect(result.dirPath).toBe("/documents/");
    });
  });

  describe("Edge cases", () => {
    it("should handle empty string values", () => {
      const result = authSearchSchema.parse({
        oneTimeToken: "",
        next: "",
      });
      expect(result.oneTimeToken).toBe("");
      expect(result.next).toBe("");
    });

    it("should handle special characters in paths", () => {
      const result = filesSearchSchema.parse({
        path: "/path/with spaces/and-dashes/file.beancount",
      });
      expect(result.path).toBe("/path/with spaces/and-dashes/file.beancount");
    });

    it("should handle unicode in paths", () => {
      const result = filesSearchSchema.parse({
        path: "/账本/主账本.beancount",
      });
      expect(result.path).toBe("/账本/主账本.beancount");
    });

    it("should handle URL encoded characters in next path", () => {
      const result = loginSearchSchema.parse({
        next: "/ledger/user%40example.com/main",
      });
      expect(result.next).toBe("/ledger/user%40example.com/main");
    });
  });
});
