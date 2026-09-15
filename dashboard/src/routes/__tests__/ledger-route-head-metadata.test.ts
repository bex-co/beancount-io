import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createLocalization } from "@/i18n/init";
import { createHeadMeta, getSEOMetadata } from "@/common/lib/seo/seo-helpers";

const ROUTES_DIR = join(import.meta.dirname, "..");
const LEDGER_ROUTE_PREFIX = "ledger.$ledgerOwner.$ledgerName";

function listLedgerOwnerNameRouteFiles(): string[] {
  return readdirSync(ROUTES_DIR)
    .filter(
      (name) =>
        name.startsWith(LEDGER_ROUTE_PREFIX) &&
        name.endsWith(".tsx") &&
        // Layout shell — not a leaf page with its own document title.
        name !== `${LEDGER_ROUTE_PREFIX}.tsx`,
    )
    .sort();
}

function isRedirectOnlyRoute(source: string): boolean {
  return source.includes("throw redirect(") && !/\bcomponent\s*:/.test(source);
}

describe("ledger route head metadata", () => {
  it("declares head metadata on every leaf ledger page route", () => {
    const missing: string[] = [];

    for (const name of listLedgerOwnerNameRouteFiles()) {
      const source = readFileSync(join(ROUTES_DIR, name), "utf8");
      if (isRedirectOnlyRoute(source)) continue;
      if (!/\bcomponent\s*:/.test(source)) continue;
      if (!/\bhead\s*:/.test(source)) {
        missing.push(name);
      }
    }

    expect(missing).toEqual([]);
  });

  it("names Accounts and Budget with the ledger via the same head helper as Holdings", () => {
    const i18n = createLocalization().i18n;
    const ledgerName = "example";

    for (const [
      titleKey,
      descriptionKey,
      expectedTitle,
      expectedDescription,
    ] of [
      [
        "seo.ledgerAccounts.title",
        "seo.ledgerAccounts.description",
        "Accounts - example",
        "All accounts in example. Browse the chart of accounts and open any account's journal.",
      ],
      [
        "seo.ledgerBudget.title",
        "seo.ledgerBudget.description",
        "Budget - example",
        "Budget targets and spending for example. Compare budgets to actuals by account and period.",
      ],
    ] as const) {
      const metadata = getSEOMetadata(i18n, titleKey, descriptionKey, {
        ledgerName,
      });
      const head = createHeadMeta(i18n, metadata);

      expect(metadata.title).toBe(expectedTitle);
      expect(metadata.description).toBe(expectedDescription);
      // createHeadMeta shape shared with /holdings — title + description +
      // og:locale; indexable by default (no robots noindex).
      expect(head.meta).toEqual(
        expect.arrayContaining([
          { title: expectedTitle },
          { name: "description", content: expectedDescription },
        ]),
      );
      expect(head.meta.some((entry) => entry.name === "robots")).toBe(false);
    }

    const accountsSource = readFileSync(
      join(ROUTES_DIR, `${LEDGER_ROUTE_PREFIX}.accounts.tsx`),
      "utf8",
    );
    const budgetSource = readFileSync(
      join(ROUTES_DIR, `${LEDGER_ROUTE_PREFIX}.budget.tsx`),
      "utf8",
    );
    expect(accountsSource).toContain("seo.ledgerAccounts.title");
    expect(accountsSource).toContain("seo.ledgerAccounts.description");
    expect(budgetSource).toContain("seo.ledgerBudget.title");
    expect(budgetSource).toContain("seo.ledgerBudget.description");
  });
});
