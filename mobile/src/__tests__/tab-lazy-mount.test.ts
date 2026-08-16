import fs from "fs";
import path from "path";
// Relative import: jest-lite has no @/ alias for value modules.
import { en } from "../translations/en";

const layoutPath = path.join(
  __dirname,
  "..",
  "..",
  "app",
  "(app)",
  "(tabs)",
  "_layout.tsx",
);
const layout = fs.readFileSync(layoutPath, "utf8");

describe("tab lazy mounting (w1/m22)", () => {
  // Before m22 the layout set `lazy: false`, so all five tab screens mounted
  // and fired their queries at launch — four screens' worth of network before
  // the user had visited any of them, and four page-view events for screens
  // nobody looked at.

  describe("the layout mounts tabs on first focus", () => {
    it("sets lazy mounting on in the shared screenOptions", () => {
      expect(/\blazy:\s*true\b/.test(layout)).toBe(true);
    });

    it("never turns lazy mounting back off", () => {
      expect(/\blazy:\s*false\b/.test(layout)).toBe(false);
    });

    it("sets the option once, not per tab", () => {
      const occurrences = layout.match(/\blazy:/g) || [];
      expect(occurrences.length).toBe(1);
    });
  });

  describe("every registered tab has a title key in the English base", () => {
    // A missing key renders the key name itself in the tab bar. The layout
    // resolves titles eagerly at module scope, so this is the failure that
    // would ship silently.
    const titleKeys = ["home", "accounts", "reports", "files", "transactions"];

    it("declares every tab title", () => {
      const declared = en as Record<string, unknown>;
      const missing = titleKeys.filter((key) => !declared[key]);
      expect(missing.join(", ")).toBe("");
    });

    it("registers exactly the five tabs those titles cover", () => {
      const registered = (layout.match(/<Tabs\.Screen\b/g) || []).length;
      expect(registered).toBe(titleKeys.length);
    });
  });

  describe("no screen renders a translation key the ledger no longer declares", () => {
    // m22/t001 deleted the Journal screen and its eight orphaned `journal*`
    // keys. A surviving `t("journalWelcomeTitle")` anywhere would render a
    // missing-translation fallback to the user.
    const roots = [
      path.join(__dirname, ".."),
      path.join(__dirname, "..", "..", "app"),
    ];

    const collectSourceFiles = (dir: string): string[] => {
      const out: string[] = [];
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        // Skip the locale files themselves, generated code, and tests — only
        // what the user actually sees rendered counts.
        if (
          entry.name === "translations" ||
          entry.name === "generated-graphql" ||
          entry.name === "__tests__"
        ) {
          continue;
        }
        if (entry.isDirectory()) {
          out.push(...collectSourceFiles(full));
        } else if (
          /\.tsx?$/.test(entry.name) &&
          !/\.test\.tsx?$/.test(entry.name)
        ) {
          out.push(full);
        }
      }
      return out;
    };

    it("resolves every journal* key that is still rendered", () => {
      const declared = en as Record<string, unknown>;
      const dangling: string[] = [];

      for (const root of roots) {
        for (const file of collectSourceFiles(root)) {
          const source = fs.readFileSync(file, "utf8");
          const calls = source.match(/\bt\(\s*"(journal[A-Za-z0-9]*)"/g) || [];
          for (const call of calls) {
            const key = (call.match(/"(journal[A-Za-z0-9]*)"/) || [])[1];
            if (key && !declared[key]) {
              dangling.push(`${path.basename(file)}: ${key}`);
            }
          }
        }
      }

      expect(dangling.join(", ")).toBe("");
    });
  });
});
