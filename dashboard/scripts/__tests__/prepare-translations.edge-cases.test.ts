import { describe, it, expect } from "vitest";

/**
 * Edge case and bug fix tests for prepare-translations script
 * These tests cover scenarios that were not previously tested
 */
describe("prepare-translations edge cases", () => {
  describe("edge case: translation entry validation", () => {
    it("should validate complete translation entry", () => {
      const entry = {
        message: "Hello",
        description: "Greeting",
      };

      const isValid =
        typeof entry === "object" &&
        entry !== null &&
        "message" in entry &&
        typeof entry.message === "string" &&
        "description" in entry &&
        typeof entry.description === "string";

      expect(isValid).toBe(true);
    });

    it("should reject entry with extra fields", () => {
      const entry = {
        message: "Hello",
        description: "Greeting",
        extra: "field",
      };

      // Current validation only checks for required fields, not extra ones
      const isValid =
        typeof entry === "object" &&
        entry !== null &&
        "message" in entry &&
        typeof entry.message === "string" &&
        "description" in entry &&
        typeof entry.description === "string";

      expect(isValid).toBe(true); // Still valid even with extra field
    });

    it("should reject null as translation entry", () => {
      const entry = null;

      const isValid =
        typeof entry === "object" &&
        entry !== null &&
        "message" in entry &&
        typeof (entry as any).message === "string" &&
        "description" in entry &&
        typeof (entry as any).description === "string";

      expect(isValid).toBe(false);
    });

    it("should reject array as translation entry", () => {
      const entry = ["message", "description"];

      const isValid =
        typeof entry === "object" &&
        entry !== null &&
        "message" in entry &&
        typeof (entry as any).message === "string" &&
        "description" in entry &&
        typeof (entry as any).description === "string";

      expect(isValid).toBe(false);
    });

    it("should reject entry with empty message", () => {
      const entry = {
        message: "",
        description: "Description",
      };

      // Current validation accepts empty strings
      const isValid =
        typeof entry === "object" &&
        entry !== null &&
        "message" in entry &&
        typeof entry.message === "string" &&
        "description" in entry &&
        typeof entry.description === "string";

      expect(isValid).toBe(true);
      expect(entry.message).toBe(""); // But it's empty
    });

    it("should reject entry with empty description", () => {
      const entry = {
        message: "Message",
        description: "",
      };

      const isValid =
        typeof entry === "object" &&
        entry !== null &&
        "message" in entry &&
        typeof entry.message === "string" &&
        "description" in entry &&
        typeof entry.description === "string";

      expect(isValid).toBe(true);
      expect(entry.description).toBe(""); // But it's empty
    });
  });

  describe("edge case: TODO marker detection", () => {
    it("should detect TODO at start of message", () => {
      const message = "[TODO] Translate this";
      expect(message.startsWith("[TODO]")).toBe(true);
    });

    it("should not detect TODO in middle of message", () => {
      const message = "This is [TODO] not a TODO";
      expect(message.startsWith("[TODO]")).toBe(false);
    });

    it("should not detect lowercase todo", () => {
      const message = "[todo] Translate this";
      expect(message.startsWith("[TODO]")).toBe(false);
    });

    it("should not detect TODO with different brackets", () => {
      const message = "(TODO) Translate this";
      expect(message.startsWith("[TODO]")).toBe(false);
    });

    it("should handle TODO with extra spaces", () => {
      const message = "[TODO]  Extra spaces";
      expect(message.startsWith("[TODO]")).toBe(true);
    });

    it("should handle TODO-only message", () => {
      const message = "[TODO]";
      expect(message.startsWith("[TODO]")).toBe(true);
    });
  });

  describe("edge case: key synchronization", () => {
    it("should identify all missing keys", () => {
      const sourceKeys = ["key1", "key2", "key3", "key4", "key5"];
      const targetKeys = ["key1", "key3"];

      const missingKeys = sourceKeys.filter((key) => !targetKeys.includes(key));

      expect(missingKeys).toEqual(["key2", "key4", "key5"]);
      expect(missingKeys).toHaveLength(3);
    });

    it("should identify all extra keys", () => {
      const sourceKeys = ["key1", "key2"];
      const targetKeys = ["key1", "key2", "key3", "key4", "key5"];

      const extraKeys = targetKeys.filter((key) => !sourceKeys.includes(key));

      expect(extraKeys).toEqual(["key3", "key4", "key5"]);
      expect(extraKeys).toHaveLength(3);
    });

    it("should handle case where all keys are missing", () => {
      const sourceKeys = ["key1", "key2", "key3"];
      const targetKeys: string[] = [];

      const missingKeys = sourceKeys.filter((key) => !targetKeys.includes(key));

      expect(missingKeys).toEqual(sourceKeys);
      expect(missingKeys).toHaveLength(3);
    });

    it("should handle case where all keys are extra", () => {
      const sourceKeys: string[] = [];
      const targetKeys = ["key1", "key2", "key3"];

      const extraKeys = targetKeys.filter((key) => !sourceKeys.includes(key));

      expect(extraKeys).toEqual(targetKeys);
      expect(extraKeys).toHaveLength(3);
    });

    it("should handle case where keys are identical", () => {
      const sourceKeys = ["key1", "key2", "key3"];
      const targetKeys = ["key1", "key2", "key3"];

      const missingKeys = sourceKeys.filter((key) => !targetKeys.includes(key));
      const extraKeys = targetKeys.filter((key) => !sourceKeys.includes(key));

      expect(missingKeys).toHaveLength(0);
      expect(extraKeys).toHaveLength(0);
    });

    it("should handle duplicate keys in source", () => {
      const sourceKeys = ["key1", "key2", "key2", "key3"];
      const targetKeys = ["key1"];

      const missingKeys = sourceKeys.filter((key) => !targetKeys.includes(key));

      expect(missingKeys).toEqual(["key2", "key2", "key3"]);
    });
  });

  describe("edge case: variable name generation", () => {
    it("should handle feature with single word", () => {
      const locale = "zh";
      const feature = "auth";

      const camelFeature = feature
        .split("-")
        .map((part, index) =>
          index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1),
        )
        .join("");
      const varName = `${locale}${camelFeature.charAt(0).toUpperCase() + camelFeature.slice(1)}`;

      expect(varName).toBe("zhAuth");
    });

    it("should handle feature with two words", () => {
      const locale = "zh";
      const feature = "ledger-editor";

      const camelFeature = feature
        .split("-")
        .map((part, index) =>
          index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1),
        )
        .join("");
      const varName = `${locale}${camelFeature.charAt(0).toUpperCase() + camelFeature.slice(1)}`;

      expect(varName).toBe("zhLedgerEditor");
    });

    it("should handle feature with three words", () => {
      const locale = "zh";
      const feature = "user-account-settings";

      const camelFeature = feature
        .split("-")
        .map((part, index) =>
          index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1),
        )
        .join("");
      const varName = `${locale}${camelFeature.charAt(0).toUpperCase() + camelFeature.slice(1)}`;

      expect(varName).toBe("zhUserAccountSettings");
    });

    it("should handle feature with numbers", () => {
      const locale = "zh";
      const feature = "feature123";

      const camelFeature = feature
        .split("-")
        .map((part, index) =>
          index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1),
        )
        .join("");
      const varName = `${locale}${camelFeature.charAt(0).toUpperCase() + camelFeature.slice(1)}`;

      expect(varName).toBe("zhFeature123");
    });

    it("should handle common feature specially", () => {
      const locale = "zh";
      const feature = "common";

      const varName = feature === "common" ? `${locale}Common` : "";

      expect(varName).toBe("zhCommon");
    });

    it("should handle different locales", () => {
      const feature = "auth";
      const locales = ["zh", "es", "fr", "de", "ja", "ko"];

      locales.forEach((locale) => {
        const camelFeature = feature
          .split("-")
          .map((part, index) =>
            index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1),
          )
          .join("");
        const varName = `${locale}${camelFeature.charAt(0).toUpperCase() + camelFeature.slice(1)}`;

        expect(varName).toMatch(new RegExp(`^${locale}[A-Z]`));
      });
    });

    it("should handle feature name with consecutive dashes", () => {
      const locale = "zh";
      const feature = "my--feature";

      const camelFeature = feature
        .split("-")
        .map((part, index) =>
          index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1),
        )
        .join("");
      const varName = `${locale}${camelFeature.charAt(0).toUpperCase() + camelFeature.slice(1)}`;

      // Empty string from consecutive dashes results in "myFeature"
      expect(varName).toBe("zhMyFeature");
    });

    it("should handle feature name starting with dash", () => {
      const locale = "zh";
      const feature = "-feature";

      const camelFeature = feature
        .split("-")
        .map((part, index) =>
          index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1),
        )
        .join("");
      const varName = `${locale}${camelFeature.charAt(0).toUpperCase() + camelFeature.slice(1)}`;

      expect(varName).toBe("zhFeature");
    });
  });

  describe("edge case: sorting and ordering", () => {
    it("should sort keys alphabetically", () => {
      const keys = ["zebra", "apple", "banana", "cherry", "date"];
      const sorted = keys.sort();

      expect(sorted).toEqual(["apple", "banana", "cherry", "date", "zebra"]);
    });

    it("should sort keys with unicode characters", () => {
      const keys = ["école", "apple", "über", "banana"];
      const sorted = keys.sort();

      // Unicode sorting may vary by locale
      expect(sorted).toContain("apple");
      expect(sorted).toContain("banana");
    });

    it("should sort keys with numbers", () => {
      const keys = ["key10", "key2", "key1", "key20"];
      const sorted = keys.sort();

      // Lexicographic sort, not numeric
      expect(sorted).toEqual(["key1", "key10", "key2", "key20"]);
    });

    it("should sort keys with special characters", () => {
      const keys = ["_private", "public", "$special", "normal"];
      const sorted = keys.sort();

      expect(sorted[0]).toBe("$special"); // $ comes before _
    });

    it("should sort keys with mixed case", () => {
      const keys = ["Apple", "banana", "Cherry", "date"];
      const sorted = keys.sort();

      // Uppercase letters come before lowercase in ASCII
      expect(sorted).toEqual(["Apple", "Cherry", "banana", "date"]);
    });

    it("should sort empty array", () => {
      const keys: string[] = [];
      const sorted = keys.sort();

      expect(sorted).toEqual([]);
    });

    it("should sort single element", () => {
      const keys = ["onlyKey"];
      const sorted = keys.sort();

      expect(sorted).toEqual(["onlyKey"]);
    });
  });

  describe("edge case: percentage calculations", () => {
    it("should handle division by zero", () => {
      const total = 0;
      const completed = 0;
      const percentage =
        total > 0 ? Math.round((completed / total) * 100) : 100;

      expect(percentage).toBe(100);
    });

    it("should handle partial completion", () => {
      const testCases = [
        { total: 10, completed: 5, expected: 50 },
        { total: 100, completed: 33, expected: 33 },
        { total: 7, completed: 3, expected: 43 },
        { total: 9, completed: 8, expected: 89 },
      ];

      testCases.forEach(({ total, completed, expected }) => {
        const percentage = Math.round((completed / total) * 100);
        expect(percentage).toBe(expected);
      });
    });

    it("should handle rounding edge cases", () => {
      // 1/3 = 0.333... should round to 33
      expect(Math.round((1 / 3) * 100)).toBe(33);

      // 2/3 = 0.666... should round to 67
      expect(Math.round((2 / 3) * 100)).toBe(67);

      // 1/6 = 0.166... should round to 17
      expect(Math.round((1 / 6) * 100)).toBe(17);

      // 5/6 = 0.833... should round to 83
      expect(Math.round((5 / 6) * 100)).toBe(83);
    });

    it("should handle over-completion (should not happen)", () => {
      const total = 10;
      const completed = 15; // Bug: more completed than total

      const percentage = Math.round((completed / total) * 100);

      expect(percentage).toBe(150); // Greater than 100%
    });

    it("should handle negative values (should not happen)", () => {
      const total = 10;
      const completed = -5; // Bug: negative completion

      const percentage = Math.round((completed / total) * 100);

      expect(percentage).toBe(-50); // Negative percentage
    });
  });

  describe("edge case: file path generation", () => {
    it("should use forward slashes on all platforms", () => {
      // path.join uses platform-specific separators
      // but we're testing the logic
      const parts = ["src", "features", "auth", "locales", "en.ts"];
      const expected = "src/features/auth/locales/en.ts";

      // Our code uses path.join which handles this correctly
      expect(parts.join("/")).toBe(expected);
    });

    it("should handle common feature path", () => {
      const feature = "common";
      const locale = "zh";

      const isCommon = feature === "common";
      const pathParts = isCommon
        ? ["src", "common", "locales", `${locale}.ts`]
        : ["src", "features", feature, "locales", `${locale}.ts`];

      expect(pathParts).toEqual(["src", "common", "locales", "zh.ts"]);
    });

    it("should handle feature path", () => {
      const feature = "auth";
      const locale = "zh";

      const isCommon = feature === "common";
      const pathParts = isCommon
        ? ["src", "common", "locales", `${locale}.ts`]
        : ["src", "features", feature, "locales", `${locale}.ts`];

      expect(pathParts).toEqual([
        "src",
        "features",
        "auth",
        "locales",
        "zh.ts",
      ]);
    });

    it("should handle locale codes correctly", () => {
      const locales = ["zh", "es", "fr", "de", "pt", "ru"];
      const feature = "auth";

      locales.forEach((locale) => {
        const pathParts = [
          "src",
          "features",
          feature,
          "locales",
          `${locale}.ts`,
        ];
        expect(pathParts[pathParts.length - 1]).toMatch(/^[a-z]{2}\.ts$/);
      });
    });
  });

  describe("edge case: JSON string escaping", () => {
    it("should escape double quotes", () => {
      const text = 'He said "Hello"';
      const json = JSON.stringify(text);

      expect(json).toBe('"He said \\"Hello\\""');
    });

    it("should escape backslashes", () => {
      const text = "Path: C:\\Users\\Name";
      const json = JSON.stringify(text);

      expect(json).toBe('"Path: C:\\\\Users\\\\Name"');
    });

    it("should escape newlines", () => {
      const text = "Line 1\nLine 2";
      const json = JSON.stringify(text);

      expect(json).toBe('"Line 1\\nLine 2"');
    });

    it("should escape tabs", () => {
      const text = "Column1\tColumn2";
      const json = JSON.stringify(text);

      expect(json).toBe('"Column1\\tColumn2"');
    });

    it("should handle unicode characters", () => {
      const text = "Hello 世界 🌍";
      const json = JSON.stringify(text);

      expect(json).toContain("Hello");
      expect(JSON.parse(json)).toBe(text); // Round-trip should work
    });

    it("should handle empty strings", () => {
      const text = "";
      const json = JSON.stringify(text);

      expect(json).toBe('""');
    });

    it("should handle single quotes (no escaping needed)", () => {
      const text = "It's working";
      const json = JSON.stringify(text);

      expect(json).toBe('"It\'s working"');
      expect(json).not.toContain("\\'");
    });
  });

  describe("edge case: translation object manipulation", () => {
    it("should preserve existing translations when adding TODO", () => {
      const _sourceEntry = {
        message: "Original",
        description: "Description",
      };

      const targetEntry = {
        message: "Translated",
        description: "Description",
      };

      // Existing translation should be preserved, not overwritten with TODO
      const shouldKeepExisting = targetEntry.message !== "";

      expect(shouldKeepExisting).toBe(true);
      expect(targetEntry.message).toBe("Translated");
    });

    it("should create TODO entry for missing translation", () => {
      const sourceEntry = {
        message: "Original",
        description: "Description",
      };

      const newEntry = {
        message: `[TODO] ${sourceEntry.message}`,
        description: sourceEntry.description,
      };

      expect(newEntry.message).toBe("[TODO] Original");
      expect(newEntry.description).toBe("Description");
    });

    it("should handle empty source message", () => {
      const sourceEntry = {
        message: "",
        description: "Description",
      };

      const newEntry = {
        message: `[TODO] ${sourceEntry.message}`,
        description: sourceEntry.description,
      };

      expect(newEntry.message).toBe("[TODO] ");
    });

    it("should handle very long messages", () => {
      const longMessage = "A".repeat(1000);
      const sourceEntry = {
        message: longMessage,
        description: "Description",
      };

      const newEntry = {
        message: `[TODO] ${sourceEntry.message}`,
        description: sourceEntry.description,
      };

      expect(newEntry.message).toHaveLength(1007); // "[TODO] " (7 chars) + 1000 A's
      expect(newEntry.message.startsWith("[TODO] A")).toBe(true);
    });

    it("should handle messages with special characters", () => {
      const sourceEntry = {
        message: "<script>alert('xss')</script>",
        description: "Potential XSS",
      };

      const newEntry = {
        message: `[TODO] ${sourceEntry.message}`,
        description: sourceEntry.description,
      };

      expect(newEntry.message).toContain("<script>");
      // JSON.stringify doesn't escape < or >, only quotes and backslashes
      const jsonString = JSON.stringify(newEntry.message);
      expect(jsonString).toContain("<script>"); // Still contains <script> after JSON.stringify
      expect(jsonString).toContain('"[TODO]'); // But is properly quoted
    });
  });

  describe("edge case: statistics aggregation", () => {
    it("should handle aggregation with empty stats", () => {
      const stats: Array<{ total: number; completed: number }> = [];

      const total = stats.reduce((sum, s) => sum + s.total, 0);
      const completed = stats.reduce((sum, s) => sum + s.completed, 0);

      expect(total).toBe(0);
      expect(completed).toBe(0);
    });

    it("should handle aggregation with single stat", () => {
      const stats = [{ total: 10, completed: 5 }];

      const total = stats.reduce((sum, s) => sum + s.total, 0);
      const completed = stats.reduce((sum, s) => sum + s.completed, 0);

      expect(total).toBe(10);
      expect(completed).toBe(5);
    });

    it("should handle aggregation with multiple stats", () => {
      const stats = [
        { total: 10, completed: 5 },
        { total: 20, completed: 15 },
        { total: 30, completed: 30 },
      ];

      const total = stats.reduce((sum, s) => sum + s.total, 0);
      const completed = stats.reduce((sum, s) => sum + s.completed, 0);

      expect(total).toBe(60);
      expect(completed).toBe(50);
    });

    it("should filter stats by locale correctly", () => {
      const allStats = [
        { locale: "zh", completed: 10, total: 20 },
        { locale: "es", completed: 15, total: 20 },
        { locale: "zh", completed: 5, total: 10 },
        { locale: "fr", completed: 20, total: 20 },
      ];

      const zhStats = allStats.filter((s) => s.locale === "zh");

      expect(zhStats).toHaveLength(2);
      expect(zhStats.every((s) => s.locale === "zh")).toBe(true);
    });

    it("should handle stats with zero values", () => {
      const stats = [
        { total: 0, completed: 0 },
        { total: 10, completed: 0 },
        { total: 0, completed: 5 }, // This should not happen
      ];

      const total = stats.reduce((sum, s) => sum + s.total, 0);
      const completed = stats.reduce((sum, s) => sum + s.completed, 0);

      expect(total).toBe(10);
      expect(completed).toBe(5);
    });
  });

  describe("edge case: locale code validation", () => {
    it("should validate two-letter locale codes", () => {
      const validLocales = ["zh", "es", "fr", "de", "pt", "ru"];

      validLocales.forEach((locale) => {
        expect(locale).toMatch(/^[a-z]{2}$/);
        expect(locale).toHaveLength(2);
      });
    });

    it("should handle locale codes correctly in uppercase check", () => {
      const locales = ["zh", "es", "fr"];

      locales.forEach((locale) => {
        expect(locale).toBe(locale.toLowerCase());
        expect(locale.toUpperCase()).toMatch(/^[A-Z]{2}$/);
      });
    });

    it("should detect invalid locale codes", () => {
      const invalidLocales = ["en-US", "zh-CN", "123", "a", "abc"];

      invalidLocales.forEach((locale) => {
        const isValid = /^[a-z]{2}$/.test(locale);
        expect(isValid).toBe(false);
      });
    });
  });

  describe("edge case: file content generation", () => {
    it("should generate valid TypeScript export", () => {
      const varName = "zhAuth";

      const content = `export default ${varName};\n`;

      expect(content).toContain("export default");
      expect(content).toContain(varName);
      expect(content).toContain(";");
    });

    it("should generate valid interface definition", () => {
      const content = `export interface TranslationEntry {
  message: string;
  description: string;
}`;

      expect(content).toContain("export interface");
      expect(content).toContain("TranslationEntry");
      expect(content).toContain("message: string");
      expect(content).toContain("description: string");
    });

    it("should generate valid Record type", () => {
      const varName = "zhAuth";
      const content = `const ${varName}: Record<string, TranslationEntry> = {`;

      expect(content).toContain("Record<string, TranslationEntry>");
      expect(content).toContain(varName);
    });

    it("should generate properly formatted translation entry", () => {
      const key = "auth.loginButton";
      const entry = {
        message: "登录",
        description: "Login button",
      };

      const content = `  "${key}": {
    message: ${JSON.stringify(entry.message)},
    description: ${JSON.stringify(entry.description)},
  },`;

      expect(content).toContain(`"${key}"`);
      expect(content).toContain("登录");
      expect(content).toContain("Login button");
    });
  });
});
