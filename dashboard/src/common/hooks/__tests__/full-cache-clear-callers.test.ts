import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * A ledger write refreshes with `useLedgerWriteRefresh`, which keeps the
 * account queries. Evicting all of ROOT_QUERY is for the few places where
 * nothing cached may survive (w1/185, `dashboard/AGENTS.md`).
 */
const FULL_CLEAR_ALLOWED = [
  // Out of date → Refresh: someone else changed the ledger.
  "common/components/ledger-layout/ledger-out-of-date-indicator.tsx",
  // Deleting the account.
  "features/user-settings/pages/general/danger-zone-section.tsx",
  // Deleting a whole ledger changes the account's ledger count.
  "features/ledger-list/pages/dashboard-page/components/dashboard-sidebar.tsx",
];

const SRC = join(__dirname, "../../..");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return entry.name === "__tests__" ? [] : sourceFiles(path);
    }
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

describe("full cache clears", () => {
  it("happen only where nothing cached may survive", () => {
    const callers = sourceFiles(SRC)
      .filter((path) =>
        readFileSync(path, "utf8").includes("useApolloCacheClear()"),
      )
      .map((path) => relative(SRC, path))
      .filter((path) => path !== "common/hooks/use-apollo-cache.ts")
      .sort();

    expect(callers).toEqual([...FULL_CLEAR_ALLOWED].sort());
  });
});
