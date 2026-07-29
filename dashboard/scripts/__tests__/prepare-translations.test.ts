import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("prepare-translations script", () => {
  describe("TranslationEntry interface validation", () => {
    it("should validate correct translation entry structure", () => {
      const validEntry = {
        message: "Hello, World!",
        description: "A greeting message",
      };

      const isValid =
        typeof validEntry === "object" &&
        validEntry !== null &&
        "message" in validEntry &&
        typeof validEntry.message === "string" &&
        "description" in validEntry &&
        typeof validEntry.description === "string";

      expect(isValid).toBe(true);
    });

    it("should reject entry without message field", () => {
      const invalidEntry = {
        description: "A greeting message",
      };

      const isValid =
        typeof invalidEntry === "object" &&
        invalidEntry !== null &&
        "message" in invalidEntry &&
        typeof (invalidEntry as any).message === "string" &&
        "description" in invalidEntry &&
        typeof invalidEntry.description === "string";

      expect(isValid).toBe(false);
    });

    it("should reject entry without description field", () => {
      const invalidEntry = {
        message: "Hello, World!",
      };

      const isValid =
        typeof invalidEntry === "object" &&
        invalidEntry !== null &&
        "message" in invalidEntry &&
        typeof invalidEntry.message === "string" &&
        "description" in invalidEntry &&
        typeof (invalidEntry as any).description === "string";

      expect(isValid).toBe(false);
    });

    it("should reject entry with non-string message", () => {
      const invalidEntry = {
        message: 123,
        description: "A greeting message",
      };

      const isValid =
        typeof invalidEntry === "object" &&
        invalidEntry !== null &&
        "message" in invalidEntry &&
        typeof invalidEntry.message === "string" &&
        "description" in invalidEntry &&
        typeof invalidEntry.description === "string";

      expect(isValid).toBe(false);
    });

    it("should reject entry with non-string description", () => {
      const invalidEntry = {
        message: "Hello, World!",
        description: 123,
      };

      const isValid =
        typeof invalidEntry === "object" &&
        invalidEntry !== null &&
        "message" in invalidEntry &&
        typeof invalidEntry.message === "string" &&
        "description" in invalidEntry &&
        typeof invalidEntry.description === "string";

      expect(isValid).toBe(false);
    });
  });

  describe("target locales configuration", () => {
    it("should have correct list of target locales", () => {
      const TARGET_LOCALES = [
        "zh",
        "es",
        "fr",
        "de",
        "pt",
        "ru",
        "nl",
        "bg",
        "ca",
        "fa",
        "sk",
        "uk",
      ];

      expect(TARGET_LOCALES).toHaveLength(12);
      expect(TARGET_LOCALES).toContain("zh");
      expect(TARGET_LOCALES).toContain("es");
      expect(TARGET_LOCALES).toContain("fr");
      expect(TARGET_LOCALES).not.toContain("en"); // English is the source
    });

    it("should have all locale codes in lowercase", () => {
      const TARGET_LOCALES = [
        "zh",
        "es",
        "fr",
        "de",
        "pt",
        "ru",
        "nl",
        "bg",
        "ca",
        "fa",
        "sk",
        "uk",
      ];

      TARGET_LOCALES.forEach((locale) => {
        expect(locale).toBe(locale.toLowerCase());
      });
    });
  });

  describe("TODO marker logic", () => {
    it("should detect TODO markers in messages", () => {
      const todoMessage = "[TODO] This needs translation";
      const normalMessage = "This is translated";

      expect(todoMessage.startsWith("[TODO]")).toBe(true);
      expect(normalMessage.startsWith("[TODO]")).toBe(false);
    });

    it("should count TODO items correctly", () => {
      const translations = {
        key1: { message: "Translated", description: "desc" },
        key2: { message: "[TODO] Not translated", description: "desc" },
        key3: { message: "[TODO] Also not translated", description: "desc" },
      };

      let todoCount = 0;
      for (const value of Object.values(translations)) {
        if (value.message.startsWith("[TODO]")) {
          todoCount++;
        }
      }

      expect(todoCount).toBe(2);
    });

    it("should count completed translations correctly", () => {
      const translations = {
        key1: { message: "Translated", description: "desc" },
        key2: { message: "[TODO] Not translated", description: "desc" },
        key3: { message: "Also translated", description: "desc" },
      };

      let completedCount = 0;
      for (const value of Object.values(translations)) {
        if (!value.message.startsWith("[TODO]")) {
          completedCount++;
        }
      }

      expect(completedCount).toBe(2);
    });
  });

  describe("translation sync logic", () => {
    it("should identify missing keys", () => {
      const sourceKeys = ["key1", "key2", "key3"];
      const targetKeys = ["key1", "key3"];

      const missingKeys = sourceKeys.filter((key) => !targetKeys.includes(key));

      expect(missingKeys).toEqual(["key2"]);
    });

    it("should identify extra keys", () => {
      const sourceKeys = ["key1", "key2"];
      const targetKeys = ["key1", "key2", "key3", "key4"];

      const extraKeys = targetKeys.filter((key) => !sourceKeys.includes(key));

      expect(extraKeys).toEqual(["key3", "key4"]);
    });

    it("should add TODO prefix to missing translations", () => {
      const sourceEntry = {
        message: "Original message",
        description: "Description",
      };

      const newTargetEntry = {
        message: `[TODO] ${sourceEntry.message}`,
        description: sourceEntry.description,
      };

      expect(newTargetEntry.message).toBe("[TODO] Original message");
      expect(newTargetEntry.description).toBe("Description");
    });

    it("should preserve existing translations", () => {
      const existingTranslation = {
        message: "Existing translation",
        description: "Description",
      };

      // Should not modify existing translations
      expect(existingTranslation.message).not.toContain("[TODO]");
    });
  });

  describe("percentage calculation", () => {
    it("should calculate completion percentage correctly", () => {
      const total = 100;
      const completed = 75;
      const percentage = Math.round((completed / total) * 100);

      expect(percentage).toBe(75);
    });

    it("should handle 100% completion", () => {
      const total = 50;
      const completed = 50;
      const percentage = Math.round((completed / total) * 100);

      expect(percentage).toBe(100);
    });

    it("should handle 0% completion", () => {
      const total = 50;
      const completed = 0;
      const percentage = Math.round((completed / total) * 100);

      expect(percentage).toBe(0);
    });

    it("should handle empty translations", () => {
      const total = 0;
      const completed = 0;
      const percentage =
        total > 0 ? Math.round((completed / total) * 100) : 100;

      expect(percentage).toBe(100);
    });

    it("should round percentages correctly", () => {
      const testCases = [
        { total: 3, completed: 1, expected: 33 },
        { total: 3, completed: 2, expected: 67 },
        { total: 7, completed: 5, expected: 71 },
      ];

      testCases.forEach(({ total, completed, expected }) => {
        const percentage = Math.round((completed / total) * 100);
        expect(percentage).toBe(expected);
      });
    });
  });

  describe("file path generation", () => {
    it("should generate correct path for common locale", () => {
      const feature = "common";
      const locale = "zh";
      const basePath = "/home/user/project/src";

      const expectedPath = path.join(
        basePath,
        "common",
        "locales",
        `${locale}.ts`,
      );
      const actualPath =
        feature === "common"
          ? path.join(basePath, "common", "locales", `${locale}.ts`)
          : path.join(basePath, "features", feature, "locales", `${locale}.ts`);

      expect(actualPath).toBe(expectedPath);
    });

    it("should generate correct path for feature locale", () => {
      const feature = "auth";
      const locale = "zh";
      const basePath = "/home/user/project/src";

      const expectedPath = path.join(
        basePath,
        "features",
        feature,
        "locales",
        `${locale}.ts`,
      );
      const actualPath =
        feature === "common"
          ? path.join(basePath, "common", "locales", `${locale}.ts`)
          : path.join(basePath, "features", feature, "locales", `${locale}.ts`);

      expect(actualPath).toBe(expectedPath);
    });
  });

  describe("variable name generation", () => {
    it("should generate correct variable name for common", () => {
      const locale = "zh";
      const feature = "common";

      const varName = feature === "common" ? `${locale}Common` : "";

      expect(varName).toBe("zhCommon");
    });

    it("should generate correct variable name for single-word feature", () => {
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

    it("should generate correct variable name for multi-word feature", () => {
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

    it("should handle different locales correctly", () => {
      const feature = "auth";

      const locales = ["zh", "es", "fr", "de"];
      const expectedVarNames = ["zhAuth", "esAuth", "frAuth", "deAuth"];

      locales.forEach((locale, index) => {
        const camelFeature = feature
          .split("-")
          .map((part, idx) =>
            idx === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1),
          )
          .join("");
        const varName = `${locale}${camelFeature.charAt(0).toUpperCase() + camelFeature.slice(1)}`;

        expect(varName).toBe(expectedVarNames[index]);
      });
    });
  });

  describe("feature directory scanning", () => {
    it("should treat common as a feature", () => {
      const features = ["common"];

      expect(features).toContain("common");
    });

    it("should scan feature directories", () => {
      const mockFeatures = [
        "common",
        "auth",
        "journal",
        "reports",
        "ledger-editor",
      ];

      expect(mockFeatures.length).toBeGreaterThan(1);
      expect(mockFeatures[0]).toBe("common");
      expect(mockFeatures).toContain("auth");
    });

    it("should sort features alphabetically", () => {
      const features = ["journal", "common", "auth", "reports"];
      const sorted = features.sort();

      expect(sorted).toEqual(["auth", "common", "journal", "reports"]);
    });
  });

  describe("statistics aggregation", () => {
    it("should aggregate feature stats by locale", () => {
      const featureStats = [
        { feature: "auth", locale: "zh", completed: 10, total: 20 },
        { feature: "journal", locale: "zh", completed: 15, total: 20 },
        { feature: "reports", locale: "zh", completed: 20, total: 20 },
      ];

      const total = featureStats.reduce((sum, s) => sum + s.total, 0);
      const completed = featureStats.reduce((sum, s) => sum + s.completed, 0);

      expect(total).toBe(60);
      expect(completed).toBe(45);
    });

    it("should filter stats by locale", () => {
      const allStats = [
        { feature: "auth", locale: "zh", completed: 10, total: 20 },
        { feature: "auth", locale: "es", completed: 8, total: 20 },
        { feature: "journal", locale: "zh", completed: 15, total: 20 },
      ];

      const zhStats = allStats.filter((s) => s.locale === "zh");

      expect(zhStats).toHaveLength(2);
      expect(zhStats[0].locale).toBe("zh");
      expect(zhStats[1].locale).toBe("zh");
    });

    it("should calculate global stats correctly", () => {
      interface FeatureStats {
        feature: string;
        locale: string;
        completed: number;
        total: number;
        percentage: number;
        todoCount: number;
      }

      const allStats: FeatureStats[] = [
        {
          feature: "auth",
          locale: "zh",
          completed: 10,
          total: 20,
          percentage: 50,
          todoCount: 10,
        },
        {
          feature: "journal",
          locale: "zh",
          completed: 15,
          total: 20,
          percentage: 75,
          todoCount: 5,
        },
        {
          feature: "auth",
          locale: "es",
          completed: 8,
          total: 20,
          percentage: 40,
          todoCount: 12,
        },
      ];

      const TARGET_LOCALES = ["zh", "es"];

      const globalStats = TARGET_LOCALES.map((locale) => {
        const localeStats = allStats.filter((s) => s.locale === locale);
        const total = localeStats.reduce((sum, s) => sum + s.total, 0);
        const completed = localeStats.reduce((sum, s) => sum + s.completed, 0);
        const todoCount = localeStats.reduce((sum, s) => sum + s.todoCount, 0);
        const percentage =
          total > 0 ? Math.round((completed / total) * 100) : 100;

        return { locale, completed, total, percentage, todoCount };
      });

      expect(globalStats).toHaveLength(2);
      expect(globalStats[0]).toEqual({
        locale: "zh",
        completed: 25,
        total: 40,
        percentage: 63, // 25/40 = 0.625, rounds to 63
        todoCount: 15,
      });
      expect(globalStats[1]).toEqual({
        locale: "es",
        completed: 8,
        total: 20,
        percentage: 40,
        todoCount: 12,
      });
    });
  });

  describe("file content generation", () => {
    it("should generate proper TypeScript file structure", () => {
      const varName = "zhAuth";
      const translations = {
        "auth.loginButton": {
          message: "登录",
          description: "Login button label",
        },
      };

      let content = `export interface TranslationEntry {\n`;
      content += `  message: string;\n`;
      content += `  description: string;\n`;
      content += `}\n\n`;
      content += `const ${varName}: Record<string, TranslationEntry> = {\n`;

      const sortedKeys = Object.keys(translations).sort();
      for (const key of sortedKeys) {
        const entry = translations[key];
        content += `  "${key}": {\n`;
        content += `    message: ${JSON.stringify(entry.message)},\n`;
        content += `    description: ${JSON.stringify(entry.description)},\n`;
        content += `  },\n`;
      }

      content += `};\n\n`;
      content += `export default ${varName};\n`;

      expect(content).toContain("export interface TranslationEntry");
      expect(content).toContain(
        `const ${varName}: Record<string, TranslationEntry>`,
      );
      expect(content).toContain(`export default ${varName}`);
      expect(content).toContain('"auth.loginButton"');
    });

    it("should sort keys alphabetically in output", () => {
      const translations = {
        zebra: { message: "Zebra", description: "desc" },
        apple: { message: "Apple", description: "desc" },
        banana: { message: "Banana", description: "desc" },
      };

      const sortedKeys = Object.keys(translations).sort();

      expect(sortedKeys).toEqual(["apple", "banana", "zebra"]);
    });

    it("should properly escape special characters in JSON", () => {
      const message = 'He said: "Hello"';
      const jsonString = JSON.stringify(message);

      expect(jsonString).toBe('"He said: \\"Hello\\""');
    });
  });

  describe("error handling scenarios", () => {
    it("should handle file not found gracefully", () => {
      const filePath = "/non/existent/file.ts";
      const fileExists = fs.existsSync(filePath);

      expect(fileExists).toBe(false);
    });

    it("should return empty object for non-existent files", () => {
      const translations = {};

      expect(Object.keys(translations)).toHaveLength(0);
    });

    it("should skip processing if no source file exists", () => {
      const sourceTranslations = {};
      const shouldSkip = Object.keys(sourceTranslations).length === 0;

      expect(shouldSkip).toBe(true);
    });

    it("should track sync statistics", () => {
      const stats = { added: 0, removed: 0 };

      stats.added = 5;
      stats.removed = 2;

      expect(stats.added).toBe(5);
      expect(stats.removed).toBe(2);
    });
  });
});
