#!/usr/bin/env tsx
/**
 * Script to flatten translation keys in locale files
 * Transforms: { keyName: { message, description } }
 * To: { "namespace.keyName": { message, description } }
 */

import * as fs from "fs";
import * as path from "path";

// Define the namespaces for each directory
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

interface TransformStats {
  filesProcessed: number;
  keysTransformed: number;
  errors: string[];
}

function flattenKeys(content: string, namespace: string): string {
  // Pattern to match: keyName: {
  // But NOT: "already.quoted.key": {
  // And NOT: export, import, interface, const declarations

  const lines = content.split("\n");
  const result: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Match patterns like:  keyName: {
    // Capture the indentation, key name, and check if it's already quoted
    const match = line.match(/^(\s+)([a-zA-Z_][a-zA-Z0-9_]*):(\s*{.*)$/);

    if (match) {
      const [, indent, keyName, rest] = match;

      // Check if this looks like a translation entry (has message/description)
      // by looking at the next few lines
      // Use regex to match actual field declarations, not comments or strings
      let isTranslationEntry = false;
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        const nextLine = lines[j];
        // Match actual field declarations like: message: or description:
        // with optional whitespace and followed by a value
        if (
          /^\s+message:\s/.test(nextLine) ||
          /^\s+description:\s/.test(nextLine)
        ) {
          isTranslationEntry = true;
          break;
        }
        if (nextLine.includes("},")) {
          break;
        }
      }

      if (isTranslationEntry) {
        // Transform to flat key
        result.push(`${indent}"${namespace}.${keyName}":${rest}`);
        continue;
      }
    }

    result.push(line);
  }

  return result.join("\n");
}

function processFile(filePath: string, namespace: string): number {
  try {
    const content = fs.readFileSync(filePath, "utf-8");

    // Count how many translation entries will actually be transformed
    // by checking for keys that have message: or description: fields
    const lines = content.split("\n");
    let actualKeyCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(/^(\s+)([a-zA-Z_][a-zA-Z0-9_]*):(\s*{.*)$/);

      if (match) {
        // Check if this is a translation entry
        // Use regex to match actual field declarations, not comments or strings
        let isTranslationEntry = false;
        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          const nextLine = lines[j];
          if (
            /^\s+message:\s/.test(nextLine) ||
            /^\s+description:\s/.test(nextLine)
          ) {
            isTranslationEntry = true;
            break;
          }
          if (nextLine.includes("},")) {
            break;
          }
        }

        if (isTranslationEntry) {
          actualKeyCount++;
        }
      }
    }

    if (actualKeyCount === 0) {
      console.log(`  ⏭️  Skipping ${filePath} (no keys to transform)`);
      return 0;
    }

    const transformed = flattenKeys(content, namespace);

    // Only write if content changed
    if (transformed !== content) {
      fs.writeFileSync(filePath, transformed, "utf-8");
      console.log(`  ✅ Transformed ${filePath} (${actualKeyCount} keys)`);
      return actualKeyCount;
    } else {
      console.log(`  ⏭️  No changes needed in ${filePath}`);
      return 0;
    }
  } catch (error) {
    throw new Error(`Failed to process ${filePath}: ${error}`);
  }
}

function processDirectory(dir: string, namespace: string): TransformStats {
  const stats: TransformStats = {
    filesProcessed: 0,
    keysTransformed: 0,
    errors: [],
  };

  const absoluteDir = path.resolve(process.cwd(), dir);

  if (!fs.existsSync(absoluteDir)) {
    stats.errors.push(`Directory not found: ${absoluteDir}`);
    return stats;
  }

  const files = fs.readdirSync(absoluteDir);

  for (const file of files) {
    if (!file.endsWith(".ts") || file === "index.ts") {
      continue;
    }

    const filePath = path.join(absoluteDir, file);

    try {
      const keysTransformed = processFile(filePath, namespace);
      stats.filesProcessed++;
      stats.keysTransformed += keysTransformed;
    } catch (error) {
      stats.errors.push(`Error processing ${filePath}: ${error}`);
    }
  }

  return stats;
}

function main() {
  console.log("🔄 Flattening Translation Keys\n");
  console.log("=".repeat(80));

  const totalStats: TransformStats = {
    filesProcessed: 0,
    keysTransformed: 0,
    errors: [],
  };

  for (const [dir, namespace] of Object.entries(NAMESPACE_MAP)) {
    console.log(`\n📁 Processing ${dir} (namespace: ${namespace})`);

    const stats = processDirectory(dir, namespace);

    totalStats.filesProcessed += stats.filesProcessed;
    totalStats.keysTransformed += stats.keysTransformed;
    totalStats.errors.push(...stats.errors);

    console.log(
      `   Files: ${stats.filesProcessed}, Keys: ${stats.keysTransformed}`,
    );
  }

  console.log("\n" + "=".repeat(80));
  console.log("\n📊 Summary:");
  console.log(`   Total files processed: ${totalStats.filesProcessed}`);
  console.log(`   Total keys transformed: ${totalStats.keysTransformed}`);

  if (totalStats.errors.length > 0) {
    console.log(`\n❌ Errors (${totalStats.errors.length}):`);
    totalStats.errors.forEach((error) => console.log(`   - ${error}`));
    process.exit(1);
  }

  console.log("\n✅ All translations flattened successfully!");
}

main();
