import fs from "fs";
import path from "path";
// Relative import: jest-lite has no @/ alias for value modules.
import { getPrimaryCurrency } from "../common/currency-util";

describe("ledger currency scoping (w1/m2)", () => {
  // The bug: screens rendered the wrong ledger's operating currency (e.g. €
  // from a default ledger) because they called useLedgerMeta(userId) without
  // the selected ledgerId. These tests guard the fix from regressing.

  describe("getPrimaryCurrency — primary operating currency selection", () => {
    it("returns the first (primary) operating currency", () => {
      expect(getPrimaryCurrency(["USD"])).toBe("USD");
    });

    it("uses the first entry when a ledger declares several", () => {
      expect(getPrimaryCurrency(["EUR", "USD"])).toBe("EUR");
    });

    it("falls back to USD when the ledger declares no currency", () => {
      expect(getPrimaryCurrency([])).toBe("USD");
    });

    it("honors an explicit fallback (quick-add uses empty string)", () => {
      expect(getPrimaryCurrency([], "")).toBe("");
    });
  });

  describe("no screen resolves currency from an unscoped ledger", () => {
    const screensDir = path.join(__dirname, "..", "screens");

    const collectSourceFiles = (dir: string): string[] => {
      const out: string[] = [];
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          out.push(...collectSourceFiles(full));
        } else if (/\.tsx?$/.test(entry.name)) {
          out.push(full);
        }
      }
      return out;
    };

    // Matches the buggy call shape `useLedgerMeta(userId)` — a single argument,
    // with no selected ledgerId. The correct call passes a second argument, so a
    // comma follows `userId` and this pattern does not match.
    const UNSCOPED_CALL = /useLedgerMeta\(\s*userId\s*\)/;

    it("every useLedgerMeta caller passes the selected ledgerId", () => {
      const offenders = collectSourceFiles(screensDir)
        .filter((file) => UNSCOPED_CALL.test(fs.readFileSync(file, "utf8")))
        .map((file) => path.relative(screensDir, file));

      // Asserting against "" surfaces the offending file paths in the failure
      // message if the unscoped shape ever comes back.
      expect(offenders.join(", ")).toBe("");
    });
  });
});
