import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROUTES_DIR = join(import.meta.dirname, "..");
const ENTRY_ROUTE = "ledger.$ledgerOwner.$ledgerName.entry.$entryHash.tsx";

describe("ledger entry route", () => {
  it("declares the canonical /entry/$entryHash destination used by native Share/Copy", () => {
    const source = readFileSync(join(ROUTES_DIR, ENTRY_ROUTE), "utf8");

    expect(source).toContain(
      '"/ledger/$ledgerOwner/$ledgerName/entry/$entryHash"',
    );
    expect(source).toContain("seo.ledgerEntry.title");
    expect(source).toContain("seo.ledgerEntry.description");
    expect(source).toContain("EntryPage");
    // Metadata must stay generic — never interpolate entry source/narration.
    expect(source).not.toMatch(/slice|narration|Dispose property/);
  });

  it("is present in the generated route tree so it does not fall through to 404", () => {
    const routeTree = readFileSync(
      join(ROUTES_DIR, "..", "routeTree.gen.ts"),
      "utf8",
    );
    expect(routeTree).toContain(
      "/ledger/$ledgerOwner/$ledgerName/entry/$entryHash",
    );
  });
});
