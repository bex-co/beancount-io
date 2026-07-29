#!/usr/bin/env tsx

// Prepare translation files for translators (Feature-Based Architecture)
// This script:
// 1. Extracts all translation keys from source code (t("key") calls)
// 2. Adds missing keys to en.ts files with auto-generated messages
// 3. Syncs en.ts to other languages with [TODO] prefix
// 4. Removes unused translation keys that don't exist in en.ts
// 5. Reports translation status
// Works with the feature-based locale structure in src/features/X/locales/

import * as fs from "fs";
import * as path from "path";

const SRC_DIR = path.join(process.cwd(), "src");
const FEATURES_DIR = path.join(SRC_DIR, "features");
const COMMON_DIR = path.join(SRC_DIR, "common");

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

interface TranslationEntry {
  message: string;
  description: string;
}

interface FeatureStats {
  feature: string;
  locale: string;
  completed: number;
  total: number;
  percentage: number;
  todoCount: number;
}

interface GlobalStats {
  locale: string;
  completed: number;
  total: number;
  percentage: number;
  todoCount: number;
}

/**
 * Check if a value is in structured format
 */
function isStructuredFormat(value: unknown): value is TranslationEntry {
  return (
    typeof value === "object" &&
    value !== null &&
    "message" in value &&
    typeof value.message === "string" &&
    "description" in value &&
    typeof value.description === "string"
  );
}

/**
 * Read translations from a TypeScript file
 */
async function readTranslations(
  filePath: string,
): Promise<Record<string, TranslationEntry>> {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  try {
    // Use dynamic import to load the TypeScript module
    // Add timestamp to bust Node.js module cache for repeated reads
    const absolutePath = path.resolve(filePath);
    const fileUrl = `file://${absolutePath}?t=${Date.now()}`;
    const module = await import(fileUrl);
    const translations = module.default || module;

    // Validate structure
    const validated: Record<string, TranslationEntry> = {};
    for (const [key, value] of Object.entries(translations)) {
      if (isStructuredFormat(value)) {
        validated[key] = value;
      }
    }

    return validated;
  } catch (error) {
    console.error(`  ⚠️  Error reading ${filePath}:`, error);
    return {};
  }
}

/**
 * Write translations to a TypeScript file
 */
function writeTranslations(
  filePath: string,
  translations: Record<string, TranslationEntry>,
  locale: string,
): void {
  // Extract variable name from existing file or create new one
  const feature = path.basename(path.dirname(path.dirname(filePath)));

  // Determine variable name based on feature
  let varName: string;
  if (feature === "common" || feature === "locales") {
    varName = `${locale}Common`;
  } else {
    // Convert feature name to camelCase
    const camelFeature = feature
      .split("-")
      .map((part, index) =>
        index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1),
      )
      .join("");
    varName = `${locale}${camelFeature.charAt(0).toUpperCase() + camelFeature.slice(1)}`;
  }

  // Build file content
  let content = `export interface TranslationEntry {\n`;
  content += `  message: string;\n`;
  content += `  description: string;\n`;
  content += `}\n\n`;
  content += `const ${varName}: Record<string, TranslationEntry> = {\n`;

  // Sort keys alphabetically
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

  // Write to file
  fs.writeFileSync(filePath, content, "utf8");
}

/**
 * Sync translations from source (en) to target locale
 * - Add missing keys with [TODO] prefix
 * - Remove keys that don't exist in source
 */
async function syncTranslations(
  feature: string,
  locale: string,
): Promise<{ added: number; removed: number }> {
  const sourcePath = getLocaleFilePath(feature, "en");
  const targetPath = getLocaleFilePath(feature, locale);

  // Read source (en) and target translations
  const sourceTranslations = await readTranslations(sourcePath);
  const targetTranslations = await readTranslations(targetPath);

  if (Object.keys(sourceTranslations).length === 0) {
    // No source file exists, skip
    return { added: 0, removed: 0 };
  }

  const sourceKeys = Object.keys(sourceTranslations);
  const targetKeys = Object.keys(targetTranslations);

  // Find missing keys (in source but not in target)
  const missingKeys = sourceKeys.filter((key) => !targetKeys.includes(key));

  // Find extra keys (in target but not in source)
  const extraKeys = targetKeys.filter((key) => !sourceKeys.includes(key));

  // If no changes needed, skip
  if (missingKeys.length === 0 && extraKeys.length === 0) {
    return { added: 0, removed: 0 };
  }

  // Build new target translations
  const newTargetTranslations: Record<string, TranslationEntry> = {};

  // Copy existing translations (excluding extra keys)
  for (const key of sourceKeys) {
    if (targetTranslations[key]) {
      // Keep existing translation
      newTargetTranslations[key] = targetTranslations[key];
    } else {
      // Add missing key with [TODO] prefix
      const sourceEntry = sourceTranslations[key];
      newTargetTranslations[key] = {
        message: `[TODO] ${sourceEntry.message}`,
        description: sourceEntry.description,
      };
    }
  }

  // Write updated translations
  writeTranslations(targetPath, newTargetTranslations, locale);

  return { added: missingKeys.length, removed: extraKeys.length };
}

/**
 * Count translation keys
 */
function countKeys(obj: Record<string, TranslationEntry>): number {
  return Object.keys(obj).length;
}

/**
 * Count completed translations (no [TODO] marker)
 */
function countCompleted(obj: Record<string, TranslationEntry>): number {
  let count = 0;

  for (const value of Object.values(obj)) {
    if (isStructuredFormat(value) && !value.message.startsWith("[TODO]")) {
      count++;
    }
  }

  return count;
}

/**
 * Count TODO items
 */
function countTodos(obj: Record<string, TranslationEntry>): number {
  let count = 0;

  for (const value of Object.values(obj)) {
    if (isStructuredFormat(value) && value.message.startsWith("[TODO]")) {
      count++;
    }
  }

  return count;
}

/**
 * Get all feature directories
 */
function getFeatureDirectories(): string[] {
  const features: string[] = [];

  // Add common as a "feature"
  features.push("common");

  // Scan features directory
  if (fs.existsSync(FEATURES_DIR)) {
    const entries = fs.readdirSync(FEATURES_DIR, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const localesDir = path.join(FEATURES_DIR, entry.name, "locales");
        if (fs.existsSync(localesDir)) {
          features.push(entry.name);
        }
      }
    }
  }

  return features.sort();
}

/**
 * Get locale file path for a feature
 */
function getLocaleFilePath(feature: string, locale: string): string {
  if (feature === "common") {
    return path.join(COMMON_DIR, "locales", `${locale}.ts`);
  }
  return path.join(FEATURES_DIR, feature, "locales", `${locale}.ts`);
}

/**
 * Analyze a single feature locale
 */
async function analyzeFeatureLocale(
  feature: string,
  locale: string,
): Promise<FeatureStats | null> {
  const filePath = getLocaleFilePath(feature, locale);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const translations = await readTranslations(filePath);
  const total = countKeys(translations);
  const completed = countCompleted(translations);
  const todoCount = countTodos(translations);
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 100;

  return {
    feature,
    locale,
    completed,
    total,
    percentage,
    todoCount,
  };
}

/**
 * Generate a human-readable message from a translation key
 * Examples:
 *   "uploadFiles" -> "Upload Files"
 *   "relatedLinks.uploadFiles" -> "Upload Files"
 *   "auth.login" -> "Login"
 */
function generateMessageFromKey(key: string): string {
  // Get the last part of the key (after the last dot)
  const lastPart = key.split(".").pop() || key;

  // Convert camelCase to Title Case
  const words = lastPart
    .replace(/([A-Z])/g, " $1") // Add space before capital letters
    .split(/[\s_-]+/) // Split on spaces, underscores, or hyphens
    .filter((w) => w.length > 0)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());

  return words.join(" ");
}

/**
 * Determine which feature a translation key belongs to
 * Based on namespace prefix (e.g., "auth.login" -> "auth")
 * Falls back to "common" for keys without clear namespace
 */
function determineFeatureFromKey(key: string, features: string[]): string {
  // Check if key starts with a known feature name
  for (const feature of features) {
    if (feature === "common") continue;
    if (key.startsWith(`${feature}.`)) {
      return feature;
    }
  }

  // Default to common for unnamespaced keys or common.* keys
  return "common";
}

/**
 * Recursively find all TypeScript files in a directory
 * Excludes tests, locales, node_modules, and generated files
 */
function findTypeScriptFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir, { withFileTypes: true });

  for (const file of files) {
    const filePath = path.join(dir, file.name);

    // Skip excluded directories
    if (
      file.isDirectory() &&
      !file.name.includes("node_modules") &&
      !file.name.includes("locales") &&
      !file.name.includes("generated-graphql") &&
      !file.name.includes("__tests__")
    ) {
      findTypeScriptFiles(filePath, fileList);
    } else if (
      file.isFile() &&
      (file.name.endsWith(".ts") || file.name.endsWith(".tsx")) &&
      !file.name.includes(".test.")
    ) {
      fileList.push(filePath);
    }
  }

  return fileList;
}

/**
 * Extract all translation keys from source code
 * Scans .ts and .tsx files for t("key") and t('key') calls
 */
async function extractKeysFromCode(): Promise<Map<string, Set<string>>> {
  const keysByFeature = new Map<string, Set<string>>();

  // Find all TypeScript files in src directory
  const files = findTypeScriptFiles(SRC_DIR);

  // Regex to match t("key") or t('key') calls
  // Captures the key inside the quotes
  const tCallRegex = /\bt\(["']([^"']+)["']\)/g;

  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    const matches = content.matchAll(tCallRegex);

    for (const match of matches) {
      const key = match[1];

      // Determine feature from key namespace
      const features = getFeatureDirectories();
      const feature = determineFeatureFromKey(key, features);

      if (!keysByFeature.has(feature)) {
        keysByFeature.set(feature, new Set());
      }
      keysByFeature.get(feature)!.add(key);
    }
  }

  return keysByFeature;
}

/**
 * Add missing keys to English locale files
 * Returns count of keys added per feature
 */
async function addMissingKeysToEnglish(
  extractedKeys: Map<string, Set<string>>,
): Promise<Map<string, number>> {
  const addedCounts = new Map<string, number>();

  for (const [feature, keys] of extractedKeys.entries()) {
    const enPath = getLocaleFilePath(feature, "en");

    // Read existing English translations
    const existingTranslations = await readTranslations(enPath);
    const existingKeys = new Set(Object.keys(existingTranslations));

    // Find missing keys
    const missingKeys = Array.from(keys).filter(
      (key) => !existingKeys.has(key),
    );

    if (missingKeys.length === 0) {
      continue;
    }

    // Add missing keys to translations
    const updatedTranslations = { ...existingTranslations };

    for (const key of missingKeys) {
      updatedTranslations[key] = {
        message: generateMessageFromKey(key),
        description: "Auto-generated from code usage",
      };
    }

    // Write updated translations
    writeTranslations(enPath, updatedTranslations, "en");

    addedCounts.set(feature, missingKeys.length);
  }

  return addedCounts;
}

/**
 * Main function
 */
async function main() {
  console.log(
    "🌍 Translation Preparation & Sync (Feature-Based Architecture)\n",
  );
  console.log("=".repeat(80));

  const features = getFeatureDirectories();
  console.log(`\n📁 Found ${features.length} features with locales:\n`);
  console.log(`   ${features.join(", ")}\n`);

  // Step 1: Extract translation keys from code
  console.log("\n🔍 Step 1: Extracting translation keys from code...\n");
  const extractedKeys = await extractKeysFromCode();

  // Count total keys
  let totalKeysFound = 0;
  for (const keys of extractedKeys.values()) {
    totalKeysFound += keys.size;
  }
  console.log(`   Found ${totalKeysFound} unique translation keys in code\n`);

  // Step 2: Add missing keys to English locale files
  console.log("📝 Step 2: Adding missing keys to en.ts files...\n");
  const addedCounts = await addMissingKeysToEnglish(extractedKeys);

  if (addedCounts.size === 0) {
    console.log("   ✅ All keys already exist in en.ts files!");
  } else {
    for (const [feature, count] of addedCounts.entries()) {
      console.log(`   ${feature}: +${count} key(s) added`);
    }
  }

  // Step 3: Sync all translations (add missing, remove unused)
  console.log("\n🔄 Step 3: Syncing translation files to other languages...\n");

  let totalAdded = 0;
  let totalRemoved = 0;

  for (const locale of TARGET_LOCALES) {
    let localeAdded = 0;
    let localeRemoved = 0;

    for (const feature of features) {
      const { added, removed } = await syncTranslations(feature, locale);
      localeAdded += added;
      localeRemoved += removed;
    }

    if (localeAdded > 0 || localeRemoved > 0) {
      const changes = [];
      if (localeAdded > 0) changes.push(`+${localeAdded} added`);
      if (localeRemoved > 0) changes.push(`-${localeRemoved} removed`);
      console.log(`   ${locale.toUpperCase()}: ${changes.join(", ")}`);
    }

    totalAdded += localeAdded;
    totalRemoved += localeRemoved;
  }

  if (totalAdded === 0 && totalRemoved === 0) {
    console.log("   ✅ All translations are already in sync!");
  } else {
    console.log(
      `\n   📝 Summary: ${totalAdded} keys added, ${totalRemoved} keys removed`,
    );
  }

  // Step 2: Analyze all features and locales
  console.log("\n" + "=".repeat(80));
  console.log("\n📊 Translation Status Report\n");

  const allStats: FeatureStats[] = [];

  for (const locale of TARGET_LOCALES) {
    console.log(`\n🔍 Analyzing ${locale.toUpperCase()} translations...\n`);

    for (const feature of features) {
      const stats = await analyzeFeatureLocale(feature, locale);
      if (stats) {
        allStats.push(stats);

        const status = stats.percentage === 100 ? "✅" : "📝";
        const progressBar =
          "█".repeat(Math.floor(stats.percentage / 5)) +
          "░".repeat(20 - Math.floor(stats.percentage / 5));

        console.log(
          `   ${status} ${feature.padEnd(20)} | ${String(stats.completed).padStart(3)}/${String(stats.total).padStart(3)} | ${progressBar} ${stats.percentage}%${stats.todoCount > 0 ? ` (${stats.todoCount} TODOs)` : ""}`,
        );
      }
    }
  }

  // Calculate global stats per locale
  console.log("\n" + "=".repeat(80));
  console.log("\n📊 Overall Translation Progress by Locale:\n");
  console.log("  Locale | Completed | Total | Progress");
  console.log("  -------|-----------|-------|----------");

  const globalStats: GlobalStats[] = [];

  for (const locale of TARGET_LOCALES) {
    const localeStats = allStats.filter((s) => s.locale === locale);
    const total = localeStats.reduce((sum, s) => sum + s.total, 0);
    const completed = localeStats.reduce((sum, s) => sum + s.completed, 0);
    const todoCount = localeStats.reduce((sum, s) => sum + s.todoCount, 0);
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 100;

    globalStats.push({
      locale,
      completed,
      total,
      percentage,
      todoCount,
    });

    const progressBar =
      "█".repeat(Math.floor(percentage / 5)) +
      "░".repeat(20 - Math.floor(percentage / 5));
    const status = percentage === 100 ? "✅" : "📝";
    console.log(
      `  ${status} ${locale.padEnd(4)} | ${String(completed).padStart(9)} | ${String(total).padStart(5)} | ${progressBar} ${percentage}%${todoCount > 0 ? ` (${todoCount} TODOs)` : ""}`,
    );
  }

  // Find locales with TODOs
  const localesWithTodos = globalStats.filter((s) => s.todoCount > 0);

  if (localesWithTodos.length > 0) {
    console.log("\n" + "=".repeat(80));
    console.log("\n📝 Locales with TODO items:\n");

    for (const { locale, todoCount } of localesWithTodos) {
      console.log(`   ${locale.toUpperCase()}: ${todoCount} TODOs remaining`);

      // Show which features have TODOs
      const featureTodos = allStats
        .filter((s) => s.locale === locale && s.todoCount > 0)
        .map((s) => `${s.feature} (${s.todoCount})`);

      console.log(`      → ${featureTodos.join(", ")}\n`);
    }
  }

  console.log("\n" + "=".repeat(80));
  console.log("\n✨ Translation status report complete!\n");
  console.log("📝 How to translate:");
  console.log("   1. Navigate to src/features/<feature>/locales/<locale>.ts");
  console.log("   2. Or navigate to src/common/locales/<locale>.ts");
  console.log('   3. Search for "[TODO]" to find untranslated keys');
  console.log('   4. Replace "[TODO] English text" with translated text');
  console.log("   5. Keep the description field unchanged");
  console.log("   6. Run this script again to get updated stats\n");
  console.log(
    "💡 Tip: Use \"grep -r '\\[TODO\\]' src/features/*/locales/<locale>.ts\" to find pending translations\n",
  );
}

main();
