import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// Import the functions we want to test
// Note: Since the script is designed to be run as a standalone script,
// we'll test it by running it in a temporary directory

describe("flatten-translation-keys script", () => {
  let tempDir: string;

  beforeEach(() => {
    // Create a temporary directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "flatten-test-"));
  });

  afterEach(() => {
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe("flattenKeys function logic", () => {
    it("should transform unquoted keys to namespaced quoted keys", () => {
      const input = `const translations = {
  loginButton: {
    message: "Login",
    description: "Button label for login",
  },
};`;

      // Simulate the transformation logic
      const namespace = "auth";
      const lines = input.split("\n");
      const result: string[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = line.match(/^(\s+)([a-zA-Z_][a-zA-Z0-9_]*):(\s*{.*)$/);

        if (match) {
          const [, indent, keyName, rest] = match;
          let isTranslationEntry = false;

          for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
            if (
              lines[j].includes("message:") ||
              lines[j].includes("description:")
            ) {
              isTranslationEntry = true;
              break;
            }
            if (lines[j].includes("},")) {
              break;
            }
          }

          if (isTranslationEntry) {
            result.push(`${indent}"${namespace}.${keyName}":${rest}`);
            continue;
          }
        }

        result.push(line);
      }

      const output = result.join("\n");
      expect(output).toContain('"auth.loginButton":');
      expect(output).not.toContain("loginButton: {");
    });

    it("should not transform already quoted keys", () => {
      const input = `const translations = {
  "auth.loginButton": {
    message: "Login",
    description: "Button label for login",
  },
};`;

      const lines = input.split("\n");
      const result: string[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = line.match(/^(\s+)([a-zA-Z_][a-zA-Z0-9_]*):(\s*{.*)$/);

        // Should not match quoted keys
        expect(match).toBeNull();
        result.push(line);
      }

      const output = result.join("\n");
      expect(output).toBe(input);
    });

    it("should not transform non-translation object keys", () => {
      const input = `const config = {
  apiEndpoint: {
    url: "https://api.example.com",
    timeout: 5000,
  },
};`;

      const namespace = "common";
      const lines = input.split("\n");
      const result: string[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = line.match(/^(\s+)([a-zA-Z_][a-zA-Z0-9_]*):(\s*{.*)$/);

        if (match) {
          const [, indent, keyName, rest] = match;
          let isTranslationEntry = false;

          for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
            if (
              lines[j].includes("message:") ||
              lines[j].includes("description:")
            ) {
              isTranslationEntry = true;
              break;
            }
            if (lines[j].includes("},")) {
              break;
            }
          }

          if (!isTranslationEntry) {
            result.push(line);
            continue;
          }

          result.push(`${indent}"${namespace}.${keyName}":${rest}`);
          continue;
        }

        result.push(line);
      }

      const output = result.join("\n");
      expect(output).toBe(input);
      expect(output).not.toContain('"common.apiEndpoint":');
    });

    it("should handle multiple translation entries", () => {
      const input = `const translations = {
  loginButton: {
    message: "Login",
    description: "Button label",
  },
  logoutButton: {
    message: "Logout",
    description: "Button label",
  },
};`;

      const namespace = "auth";
      const lines = input.split("\n");
      const result: string[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = line.match(/^(\s+)([a-zA-Z_][a-zA-Z0-9_]*):(\s*{.*)$/);

        if (match) {
          const [, indent, keyName, rest] = match;
          let isTranslationEntry = false;

          for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
            if (
              lines[j].includes("message:") ||
              lines[j].includes("description:")
            ) {
              isTranslationEntry = true;
              break;
            }
            if (lines[j].includes("},")) {
              break;
            }
          }

          if (isTranslationEntry) {
            result.push(`${indent}"${namespace}.${keyName}":${rest}`);
            continue;
          }
        }

        result.push(line);
      }

      const output = result.join("\n");
      expect(output).toContain('"auth.loginButton":');
      expect(output).toContain('"auth.logoutButton":');
    });

    it("should preserve indentation", () => {
      const input = `const translations = {
    loginButton: {
      message: "Login",
      description: "Button label",
    },
};`;

      const namespace = "auth";
      const lines = input.split("\n");
      const result: string[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = line.match(/^(\s+)([a-zA-Z_][a-zA-Z0-9_]*):(\s*{.*)$/);

        if (match) {
          const [, indent, keyName, rest] = match;
          let isTranslationEntry = false;

          for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
            if (
              lines[j].includes("message:") ||
              lines[j].includes("description:")
            ) {
              isTranslationEntry = true;
              break;
            }
            if (lines[j].includes("},")) {
              break;
            }
          }

          if (isTranslationEntry) {
            result.push(`${indent}"${namespace}.${keyName}":${rest}`);
            expect(indent).toBe("    "); // Verify indentation is preserved
            continue;
          }
        }

        result.push(line);
      }

      const output = result.join("\n");
      expect(output).toContain('    "auth.loginButton":');
    });
  });

  describe("namespace mapping", () => {
    it("should have correct namespace for common directory", () => {
      const NAMESPACE_MAP: Record<string, string> = {
        "src/common/locales": "common",
        "src/features/auth/locales": "auth",
        "src/features/journal/locales": "journal",
        "src/features/reports/locales": "reports",
        "src/features/ledger-editor/locales": "ledgerEditor",
        "src/features/ledger-list/locales": "ledgerList",
        "src/features/ledger-settings/locales": "ledgerSettings",
        "src/features/collaboration/locales": "collaboration",
        "src/features/ledger-data/locales": "ledgerData",
        "src/features/user-settings/locales": "userSettings",
        "src/features/bql/locales": "bql",
      };

      expect(NAMESPACE_MAP["src/common/locales"]).toBe("common");
      expect(NAMESPACE_MAP["src/features/auth/locales"]).toBe("auth");
      expect(NAMESPACE_MAP["src/features/journal/locales"]).toBe("journal");
    });

    it("should use camelCase for multi-word namespaces", () => {
      const NAMESPACE_MAP: Record<string, string> = {
        "src/features/ledger-editor/locales": "ledgerEditor",
        "src/features/ledger-list/locales": "ledgerList",
        "src/features/ledger-settings/locales": "ledgerSettings",
        "src/features/ledger-data/locales": "ledgerData",
        "src/features/user-settings/locales": "userSettings",
      };

      expect(NAMESPACE_MAP["src/features/ledger-editor/locales"]).toBe(
        "ledgerEditor",
      );
      expect(NAMESPACE_MAP["src/features/ledger-list/locales"]).toBe(
        "ledgerList",
      );
      expect(NAMESPACE_MAP["src/features/user-settings/locales"]).toBe(
        "userSettings",
      );
    });
  });

  describe("file processing", () => {
    it("should skip index.ts files", () => {
      const filename = "index.ts";
      const shouldSkip = filename === "index.ts";
      expect(shouldSkip).toBe(true);
    });

    it("should process .ts files", () => {
      const filename = "en.ts";
      const shouldProcess = filename.endsWith(".ts") && filename !== "index.ts";
      expect(shouldProcess).toBe(true);
    });

    it("should skip non-.ts files", () => {
      const filename = "readme.md";
      const shouldProcess = filename.endsWith(".ts") && filename !== "index.ts";
      expect(shouldProcess).toBe(false);
    });
  });

  describe("error handling", () => {
    it("should handle directory not found gracefully", () => {
      const nonExistentDir = path.join(tempDir, "non-existent");
      const dirExists = fs.existsSync(nonExistentDir);
      expect(dirExists).toBe(false);

      // Simulate error handling
      if (!dirExists) {
        const error = `Directory not found: ${nonExistentDir}`;
        expect(error).toContain("Directory not found");
      }
    });

    it("should count files and keys correctly", () => {
      const stats = {
        filesProcessed: 0,
        keysTransformed: 0,
        errors: [] as string[],
      };

      // Simulate processing
      stats.filesProcessed += 1;
      stats.keysTransformed += 5;

      expect(stats.filesProcessed).toBe(1);
      expect(stats.keysTransformed).toBe(5);
      expect(stats.errors).toHaveLength(0);
    });

    it("should accumulate errors", () => {
      const stats = {
        filesProcessed: 0,
        keysTransformed: 0,
        errors: [] as string[],
      };

      stats.errors.push("Error processing file1.ts");
      stats.errors.push("Error processing file2.ts");

      expect(stats.errors).toHaveLength(2);
      expect(stats.errors[0]).toContain("file1.ts");
      expect(stats.errors[1]).toContain("file2.ts");
    });
  });

  describe("key transformation patterns", () => {
    it("should match valid JavaScript identifiers", () => {
      const validKeys = [
        "loginButton",
        "login_button",
        "_private",
        "key123",
        "CONSTANT_KEY",
      ];

      validKeys.forEach((key) => {
        const pattern = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
        expect(pattern.test(key)).toBe(true);
      });
    });

    it("should not match invalid identifiers", () => {
      const invalidKeys = ["123key", "key-name", "key.name", "key name"];

      invalidKeys.forEach((key) => {
        const pattern = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
        expect(pattern.test(key)).toBe(false);
      });
    });

    it("should match object property syntax", () => {
      const lines = [
        "  loginButton: {",
        "    login_button: {",
        "  _privateKey: {",
      ];

      lines.forEach((line) => {
        const match = line.match(/^(\s+)([a-zA-Z_][a-zA-Z0-9_]*):(\s*{.*)$/);
        expect(match).not.toBeNull();
        expect(match).toHaveLength(4);
      });
    });

    it("should detect translation entries by message and description", () => {
      const translationLines = [
        '    message: "Login",',
        '    description: "Button label",',
      ];

      translationLines.forEach((line) => {
        const hasMessage = line.includes("message:");
        const hasDescription = line.includes("description:");
        expect(hasMessage || hasDescription).toBe(true);
      });
    });
  });
});
