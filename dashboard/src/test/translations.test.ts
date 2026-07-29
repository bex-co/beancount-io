import { describe, it, expect } from "vitest";

/**
 * Translation entry interface matching the actual structure
 */
interface TranslationEntry {
  message: string;
  description: string;
}

/**
 * Extract all interpolation variables from a message string
 * @example "Hello {name}, you have {count} messages" → ["name", "count"]
 */
function extractInterpolationVars(message: string): string[] {
  const pattern = /\{([a-zA-Z0-9_]+)\}/g;
  const matches = [...message.matchAll(pattern)];
  return matches.map((match) => match[1]);
}

/**
 * Check if message uses correct single-brace syntax
 * Returns array of invalid double-brace patterns found
 * @example "Hello {{name}}" → ["{{name}}"]
 */
function findInvalidInterpolation(message: string): string[] {
  // Match {{word}} (double braces, which are invalid)
  const pattern = /\{\{([a-zA-Z0-9_]+)\}\}/g;
  const matches = [...message.matchAll(pattern)];
  return matches.map((match) => match[0]); // Return full match like "{{name}}"
}

/**
 * Load all locale files using Vite's import.meta.glob
 * Note: Using eager: true to ensure test catches changes immediately without caching issues
 */
async function loadAllLocales(): Promise<
  Map<string, Record<string, TranslationEntry>>
> {
  const locales = new Map<string, Record<string, TranslationEntry>>();

  // Use Vite's import.meta.glob to load all locale files
  // eager: true ensures modules are loaded at build time, avoiding runtime caching issues
  const commonLocales = import.meta.glob("../i18n/locales/common/*.ts", {
    eager: true,
  });
  const seoLocales = import.meta.glob("../i18n/locales/seo/*.ts", {
    eager: true,
  });
  const featureLocales = import.meta.glob("../features/**/locales/*.ts", {
    eager: true,
  });

  const allLocales = { ...commonLocales, ...seoLocales, ...featureLocales };

  for (const [path, module] of Object.entries(allLocales)) {
    // Extract filename from path (e.g., "en.ts" -> "en")
    const fileName = path.split("/").pop()?.replace(".ts", "") || "";

    // Skip index files
    if (fileName === "index") continue;

    try {
      const moduleTyped = module as {
        default?: Record<string, TranslationEntry>;
      };
      const translations = moduleTyped.default || {};

      // Merge translations for the same language from different features
      if (locales.has(fileName)) {
        const existing = locales.get(fileName)!;
        locales.set(fileName, { ...existing, ...translations });
      } else {
        locales.set(fileName, translations);
      }
    } catch (error) {
      console.error(`Failed to load locale file: ${path}`, error);
    }
  }

  return locales;
}

/**
 * Check if a variable name is valid (alphanumeric, camelCase)
 */
function isValidVariableName(name: string): boolean {
  // Must start with lowercase letter, can contain letters and numbers
  return /^[a-z][a-zA-Z0-9]*$/.test(name);
}

/**
 * Get the feature name from a translation key
 * @example "auth.login" → "auth"
 */
function getFeatureFromKey(key: string): string | null {
  const parts = key.split(".");
  return parts.length > 1 ? parts[0] : null;
}

describe("Translation Files Validation", () => {
  describe("Structure Validation", () => {
    it("should have message and description for all entries", async () => {
      const locales = await loadAllLocales();
      const errors: string[] = [];

      for (const [lang, translations] of locales) {
        for (const [key, entry] of Object.entries(translations)) {
          if (!entry || typeof entry !== "object") {
            errors.push(`[${lang}] ${key}: Entry is not an object`);
            continue;
          }

          if (!("message" in entry) || typeof entry.message !== "string") {
            errors.push(`[${lang}] ${key}: Missing or invalid 'message' field`);
          }

          if (
            !("description" in entry) ||
            typeof entry.description !== "string"
          ) {
            errors.push(
              `[${lang}] ${key}: Missing or invalid 'description' field`,
            );
          }
        }
      }

      if (errors.length > 0) {
        console.error("\nStructure validation errors found:");
        errors.forEach((err) => console.error(`  - ${err}`));
      }

      expect(errors).toHaveLength(0);
    });

    it("should not have empty messages or descriptions", async () => {
      const locales = await loadAllLocales();
      const errors: string[] = [];

      for (const [lang, translations] of locales) {
        for (const [key, entry] of Object.entries(translations)) {
          if (entry.message.trim() === "") {
            errors.push(`[${lang}] ${key}: Empty message`);
          }

          if (entry.description.trim() === "") {
            errors.push(`[${lang}] ${key}: Empty description`);
          }
        }
      }

      if (errors.length > 0) {
        console.error("\nEmpty string errors found:");
        errors.forEach((err) => console.error(`  - ${err}`));
      }

      expect(errors).toHaveLength(0);
    });
  });

  describe("Interpolation Syntax", () => {
    it("should use single braces {variable} not double braces {{variable}}", async () => {
      const locales = await loadAllLocales();
      const errors: string[] = [];

      for (const [lang, translations] of locales) {
        for (const [key, entry] of Object.entries(translations)) {
          const invalid = findInvalidInterpolation(entry.message);

          if (invalid.length > 0) {
            errors.push(
              `[${lang}] ${key}: Found invalid double-brace interpolation: ${invalid.join(", ")}`,
            );
          }
        }
      }

      if (errors.length > 0) {
        console.error("\nInterpolation syntax errors found:");
        errors.forEach((err) => console.error(`  - ${err}`));
      }

      expect(errors).toHaveLength(0);
    });

    it("should have valid variable names (alphanumeric, camelCase)", async () => {
      const locales = await loadAllLocales();
      const errors: string[] = [];

      for (const [lang, translations] of locales) {
        for (const [key, entry] of Object.entries(translations)) {
          const vars = extractInterpolationVars(entry.message);

          for (const varName of vars) {
            if (!isValidVariableName(varName)) {
              errors.push(
                `[${lang}] ${key}: Invalid variable name '${varName}' (should be camelCase alphanumeric)`,
              );
            }
          }
        }
      }

      if (errors.length > 0) {
        console.error("\nInvalid variable name errors found:");
        errors.forEach((err) => console.error(`  - ${err}`));
      }

      expect(errors).toHaveLength(0);
    });

    it("should not have malformed interpolation syntax", async () => {
      const locales = await loadAllLocales();
      const errors: string[] = [];

      for (const [lang, translations] of locales) {
        for (const [key, entry] of Object.entries(translations)) {
          // Check for unclosed braces: {{ without }}
          if (entry.message.includes("{{") && !entry.message.includes("}}")) {
            errors.push(
              `[${lang}] ${key}: Unclosed interpolation ({{ without }})`,
            );
          }

          // Check for mismatched braces: {{{ or }}}
          if (entry.message.match(/\{{3,}/) || entry.message.match(/\}{3,}/)) {
            errors.push(`[${lang}] ${key}: Malformed braces (too many)`);
          }
        }
      }

      if (errors.length > 0) {
        console.error("\nMalformed interpolation errors found:");
        errors.forEach((err) => console.error(`  - ${err}`));
      }

      expect(errors).toHaveLength(0);
    });
  });

  describe("Cross-Language Consistency", () => {
    it("should have same keys across all languages", async () => {
      const locales = await loadAllLocales();
      const errors: string[] = [];

      // Get English as the reference language
      const enTranslations = locales.get("en");
      if (!enTranslations) {
        throw new Error("English translations not found");
      }

      const enKeys = new Set(Object.keys(enTranslations));

      // Check all other languages have the same keys
      for (const [lang, translations] of locales) {
        if (lang === "en") continue;

        const langKeys = new Set(Object.keys(translations));

        // Find missing keys (in English but not in this language)
        const missing = [...enKeys].filter((key) => !langKeys.has(key));
        if (missing.length > 0) {
          errors.push(
            `[${lang}] Missing ${missing.length} keys: ${missing.slice(0, 5).join(", ")}${missing.length > 5 ? "..." : ""}`,
          );
        }

        // Find extra keys (in this language but not in English)
        const extra = [...langKeys].filter((key) => !enKeys.has(key));
        if (extra.length > 0) {
          errors.push(
            `[${lang}] Extra ${extra.length} keys not in English: ${extra.slice(0, 5).join(", ")}${extra.length > 5 ? "..." : ""}`,
          );
        }
      }

      if (errors.length > 0) {
        console.error("\nKey consistency errors found:");
        errors.forEach((err) => console.error(`  - ${err}`));
      }

      expect(errors).toHaveLength(0);
    });

    it("should have matching interpolation variables for same keys", async () => {
      const locales = await loadAllLocales();
      const enTranslations = locales.get("en")!;
      const errors: string[] = [];

      // For each English translation with variables
      for (const [key, enEntry] of Object.entries(enTranslations)) {
        const enVars = extractInterpolationVars(enEntry.message);

        if (enVars.length === 0) continue; // Skip non-interpolated strings

        const enVarSet = new Set(enVars);

        // Check all other languages have same variables
        for (const [lang, translations] of locales) {
          if (lang === "en") continue;

          const translation = translations[key];
          if (!translation) {
            // Already reported in previous test
            continue;
          }

          const langVars = extractInterpolationVars(translation.message);
          const langVarSet = new Set(langVars);

          // Check for missing or extra variables
          const missing = [...enVarSet].filter((v) => !langVarSet.has(v));
          const extra = [...langVarSet].filter((v) => !enVarSet.has(v));

          if (missing.length > 0 || extra.length > 0) {
            errors.push(
              `[${lang}] ${key}: Variable mismatch. Expected: [${enVars.join(", ")}], Got: [${langVars.join(", ")}]`,
            );
          }
        }
      }

      if (errors.length > 0) {
        console.error("\nCross-language variable consistency errors:");
        errors.forEach((err) => console.error(`  - ${err}`));
      }

      expect(errors).toHaveLength(0);
    });
  });

  describe("Namespace Validation", () => {
    it("should have properly prefixed namespace for feature locales", async () => {
      const locales = await loadAllLocales();
      const errors: string[] = [];

      // Common keys don't need a feature prefix
      const commonPrefixes = ["common", "seo"];

      for (const [lang, translations] of locales) {
        for (const key of Object.keys(translations)) {
          const feature = getFeatureFromKey(key);

          if (feature === null) {
            errors.push(
              `[${lang}] ${key}: Missing namespace prefix (should be like 'featureName.keyName')`,
            );
          } else if (!commonPrefixes.includes(feature)) {
            // Check that feature prefix is meaningful (not just random text)
            if (feature.length < 2) {
              errors.push(
                `[${lang}] ${key}: Feature prefix '${feature}' is too short`,
              );
            }
          }
        }
      }

      if (errors.length > 0) {
        console.error("\nNamespace validation errors found:");
        errors.forEach((err) => console.error(`  - ${err}`));
      }

      expect(errors).toHaveLength(0);
    });

    it("should not have namespace conflicts between features", async () => {
      const locales = await loadAllLocales();
      const errors: string[] = [];

      // Track which top-level prefixes exist
      const topLevelPrefixes = new Set<string>();

      for (const [lang, translations] of locales) {
        if (lang !== "en") continue; // Only check English to avoid duplicates

        for (const key of Object.keys(translations)) {
          const parts = key.split(".");
          if (parts.length > 0) {
            const topLevelPrefix = parts[0];
            topLevelPrefixes.add(topLevelPrefix);
          }
        }
      }

      // Check for actual conflicts: keys that are both a namespace and a leaf key
      // For example: "auth" exists as both "auth.login" and "auth" (leaf)
      for (const [lang, translations] of locales) {
        if (lang !== "en") continue;

        const allKeys = Object.keys(translations);
        for (const key of allKeys) {
          // Check if this key is used as both a prefix and a complete key
          const hasAsPrefix = allKeys.some(
            (k) => k !== key && k.startsWith(key + "."),
          );
          const hasAsLeaf = allKeys.includes(key);

          if (hasAsPrefix && hasAsLeaf) {
            errors.push(
              `Namespace conflict: '${key}' is used as both a complete key and a prefix for other keys`,
            );
          }
        }
      }

      if (errors.length > 0) {
        console.error("\nNamespace conflict errors found:");
        errors.forEach((err) => console.error(`  - ${err}`));
      }

      expect(errors).toHaveLength(0);
    });
  });

  describe("Chinese Translation Style Rules", () => {
    it('should use informal "你" instead of formal "您" in Chinese translations', async () => {
      const locales = await loadAllLocales();
      const errors: string[] = [];

      const zhTranslations = locales.get("zh");
      if (!zhTranslations) {
        // If no Chinese translations, skip this test
        return;
      }

      for (const [key, entry] of Object.entries(zhTranslations)) {
        // Check both message and description for formal "您"
        if (entry.message.includes("您")) {
          errors.push(
            `[zh] ${key}: Found formal "您" in message. Please use informal "你" instead.`,
          );
        }

        if (entry.description.includes("您")) {
          errors.push(
            `[zh] ${key}: Found formal "您" in description. Please use informal "你" instead.`,
          );
        }
      }

      if (errors.length > 0) {
        console.error(
          '\nChinese translation style errors found (use "你" not "您"):',
        );
        errors.forEach((err) => console.error(`  - ${err}`));
      }

      expect(errors).toHaveLength(0);
    });
  });

  describe("Source Code Translation Key Validation", () => {
    it("should only use namespaced keys in t() calls", async () => {
      const errors: string[] = [];

      // Load valid keys from locale files
      const locales = await loadAllLocales();
      const enTranslations = locales.get("en");

      if (!enTranslations) {
        throw new Error("English translations not found");
      }

      const validKeys = new Set(Object.keys(enTranslations));
      const validPrefixes = new Set<string>();

      // Extract all valid namespace prefixes
      for (const key of validKeys) {
        const prefix = key.split(".")[0];
        if (prefix) {
          validPrefixes.add(prefix);
        }
      }

      // Find all TypeScript files in src (eager: true avoids sequential async loads)
      const tsFiles = import.meta.glob(
        "../!(node_modules|dist|build|test)/**/*.{ts,tsx}",
        { query: "?raw", eager: true },
      );

      // Pattern to match t() calls
      const tCallRegex = /\bt\(\s*["']([^"']+)["']/g;

      for (const [filePath, module] of Object.entries(tsFiles)) {
        // Skip test files, locale files, and the translations hook itself (contains examples)
        if (
          filePath.includes("__tests__") ||
          filePath.includes("locales/") ||
          filePath.includes("translations.test.ts") ||
          filePath.includes("use-translations.ts")
        ) {
          continue;
        }

        try {
          const fileContent = (module as { default: string }).default;
          const matches = fileContent.matchAll(tCallRegex);

          for (const match of matches) {
            const key = match[1];
            const relativePath = filePath.replace("../", "src/");

            // Check 1: Key must contain a dot (namespace prefix)
            if (!key.includes(".")) {
              errors.push(
                `${relativePath}:\n` +
                  `  ❌ t("${key}") uses unprefixed key\n` +
                  `  Required: t("namespace.keyName")\n` +
                  `  Examples: t("auth.login"), t("common.save"), t("journal.export")\n` +
                  `  Valid prefixes: ${Array.from(validPrefixes).sort().join(", ")}`,
              );
              continue;
            }

            // Check 2: Namespace prefix must be valid
            const prefix = key.split(".")[0];
            if (!validPrefixes.has(prefix)) {
              errors.push(
                `${relativePath}:\n` +
                  `  ⚠️  t("${key}") uses unknown namespace "${prefix}"\n` +
                  `  Valid prefixes: ${Array.from(validPrefixes).sort().join(", ")}`,
              );
            }

            // Check 3: Key must exist in locale files
            if (!validKeys.has(key)) {
              errors.push(
                `${relativePath}:\n` +
                  `  ⚠️  t("${key}") key not found in locale files\n` +
                  `  Add this key to src/features/${prefix}/locales/en.ts, src/i18n/locales/common/en.ts, or src/i18n/locales/seo/en.ts`,
              );
            }
          }
        } catch (error) {
          console.error(`Failed to process file: ${filePath}`, error);
        }
      }

      if (errors.length > 0) {
        console.error("\n" + "=".repeat(80));
        console.error("❌ TRANSLATION KEY VALIDATION ERRORS\n");
        errors.forEach((err) => console.error(err + "\n"));
        console.error("=".repeat(80) + "\n");
        console.error("All translation keys must use namespace prefixes!");
        console.error('Format: t("namespace.keyName")');
        console.error("\nValid namespace prefixes:");
        console.error("  " + Array.from(validPrefixes).sort().join(", "));
      }

      expect(errors).toHaveLength(0);
    });
  });

  describe("Parameter Usage Validation", () => {
    it("should provide all required parameters when calling t()", async () => {
      const errors: string[] = [];

      // Load all locale files to extract required parameters
      const locales = await loadAllLocales();
      const enTranslations = locales.get("en");

      if (!enTranslations) {
        throw new Error("English translations not found");
      }

      // Build map of key -> required parameters
      const requiredParams = new Map<string, Set<string>>();
      for (const [key, entry] of Object.entries(enTranslations)) {
        const params = extractInterpolationVars(entry.message);
        if (params.length > 0) {
          requiredParams.set(key, new Set(params));
        }
      }

      // Find all TypeScript/TSX files in src (eager: true avoids sequential async loads)
      const tsFiles = import.meta.glob(
        "../!(node_modules|dist|build)/**/*.{ts,tsx}",
        {
          query: "?raw",
          eager: true,
        },
      );

      // Pattern to match t() calls: t("key", { params })
      // Handles: t("key"), t("key", {}), t("key", { foo }), t("key", { foo: bar })
      const tCallRegex =
        /\bt\(\s*["']([^"']+)["']\s*(?:,\s*\{([^}]*)\})?\s*\)/g;

      for (const [filePath, module] of Object.entries(tsFiles)) {
        // Skip test files, generated files, and this file
        if (
          filePath.includes("__tests__") ||
          filePath.includes("generated") ||
          filePath.includes("test/translations.test.ts")
        ) {
          continue;
        }

        try {
          const fileContent = (module as { default: string }).default;
          const matches = fileContent.matchAll(tCallRegex);

          for (const match of matches) {
            const key = match[1];
            const paramsStr = match[2] || "";

            // Check if this key requires parameters
            if (!requiredParams.has(key)) {
              continue; // No parameters required
            }

            const required = requiredParams.get(key)!;

            // Parse provided parameters from object: { foo, bar: baz, count }
            const provided = new Set<string>();
            if (paramsStr.trim()) {
              // Match parameter names (handles shorthand and key: value syntax)
              // Examples: "foo" from "foo,", "bar" from "bar: baz,", "count" from "count }"
              const paramPattern = /([a-zA-Z_][a-zA-Z0-9_]*)\s*(?::|,|}|$)/g;
              const paramMatches = paramsStr.matchAll(paramPattern);
              for (const pm of paramMatches) {
                provided.add(pm[1]);
              }
            }

            // Check for missing parameters
            const missing = [...required].filter((p) => !provided.has(p));

            if (missing.length > 0) {
              // Get relative path for better error messages
              const relativePath = filePath.replace("../", "src/");
              errors.push(
                `${relativePath}:\n` +
                  `  t("${key}") missing required parameters: ${missing.join(", ")}\n` +
                  `  Required: {${[...required].join(", ")}}\n` +
                  `  Provided: {${[...provided].join(", ")}}`,
              );
            }
          }
        } catch (error) {
          console.error(`Failed to process file: ${filePath}`, error);
        }
      }

      if (errors.length > 0) {
        console.error("\n❌ Translation parameter validation errors found:\n");
        errors.forEach((err) => console.error(err + "\n"));
      }

      expect(errors).toHaveLength(0);
    });
  });
});
