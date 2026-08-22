import { expectParity } from "../expect-parity";

/**
 * Behavioral parity for the four supported `fava.plugins.*` plugins, on a
 * ledger that actually enables all of them (`plugin-book`, see seed.ts):
 *
 *  - forecast: `# "… [MONTHLY REPEAT 3 TIMES]"` marker transaction
 *  - amortize_over: `amortize_months: 3` metadata
 *  - link_documents: `document:` metadata + a real document directive
 *  - tag_discovered_documents: enabled (no-op without auto-discovery on
 *    both sides — explicit `document` directives are not "discovered")
 *
 * Python executes the real fava-slim plugins; v2 strips the plugin lines and
 * applies its TS reimplementations — every read below must still match.
 */
const BOOK = "parityuser/plugin-book";
const AUTO = "parityuser/autoacct-book";
const IMPL = "parityuser/implprice-book";
const UNKNOWN = "parityuser/unknownplug-book";

describe("parity: plugin behavior (fava.plugins.*)", () => {
  it("plugins list and errors", async () => {
    expect(
      (
        await expectParity({
          operation: "getLedgerPlugins",
          path: `/reports/${BOOK}/plugins`,
        })
      ).status,
    ).toBe(200);
    const errors = await expectParity({
      operation: "getLedgerErrors",
      path: `/reports/${BOOK}/errors`,
    });
    expect(errors.normalized).toEqual({ success: true, data: [] });
  });

  it("journal contains identical plugin-generated entries", async () => {
    const res = await expectParity({
      operation: "getJournal",
      path: `/journal/${BOOK}`,
    });
    const data = res.normalized as {
      data: { total: number; items: Array<Record<string, unknown>> };
    };
    expect(data.data.total).toBeGreaterThan(10);
    const narrations = data.data.items
      .map((i) => String(i.narration ?? ""))
      .filter((n) => n.includes("Electricity"));
    // [MONTHLY REPEAT 3 TIMES] = 3 occurrences total (identical on both)
    expect(narrations.length).toBe(3);
    const amortized = data.data.items.filter((i) =>
      String(i.narration ?? "").includes("Amortize car insurance"),
    );
    expect(amortized.length).toBe(3);
    // link_documents adds the #linked tag on the paying transaction
    const linked = data.data.items.find((i) =>
      (i.tags as string[] | undefined)?.includes("linked"),
    );
    expect(linked).toBeTruthy();
  });

  it("plaintext journal renders identically", async () => {
    const res = await expectParity({
      operation: "plaintextJournal",
      path: `/journal/${BOOK}/plaintext`,
    });
    expect(res.status).toBe(200);
  });

  it("statements over plugin-transformed stream", async () => {
    for (const path of [
      "income-statement",
      "balance-sheet",
      "trial-balance",
      "overview",
    ]) {
      const res = await expectParity({
        operation: {
          "income-statement": "getLedgerIncomeStatement",
          "balance-sheet": "getLedgerBalanceSheet",
          "trial-balance": "getLedgerTrialBalance",
          overview: "getLedgerOverview",
        }[path]!,
        path: `/reports/${BOOK}/${path}`,
      });
      expect(res.status).toBe(200);
    }
  });

  it("tags / links / documents surfaced by the plugins", async () => {
    for (const [op, path] of [
      ["getLedgerTags", "tags"],
      ["getLedgerLinks", "links"],
      ["getLedgerDocuments", "documents"],
    ] as const) {
      const res = await expectParity({
        operation: op,
        path: `/reports/${BOOK}/${path}`,
      });
      expect(res.status).toBe(200);
    }
  });

  it("BQL sums over the amortized/forecast stream", async () => {
    const res = await expectParity({
      operation: "queryShell",
      path: `/shell/${BOOK}/query`,
      query: {
        query:
          "SELECT account, sum(position) GROUP BY account ORDER BY account",
      },
    });
    expect(res.status).toBe(200);
  });
});

describe("parity: beancount builtin plugins (rustledger-native)", () => {
  it("auto_accounts synthesizes identical Open directives", async () => {
    const res = await expectParity({
      operation: "getJournal",
      path: `/journal/${AUTO}`,
    });
    const items = (
      res.normalized as { data: { items: Array<{ directive_type: string }> } }
    ).data.items;
    expect(items.map((i) => i.directive_type)).toEqual([
      "Transaction",
      "Open",
      "Open",
    ]);
    expect(
      (
        await expectParity({
          operation: "getLedgerErrors",
          path: `/reports/${AUTO}/errors`,
        })
      ).normalized,
    ).toEqual({ success: true, data: [] });
  });

  it("implicit_prices synthesizes identical Price directives", async () => {
    const res = await expectParity({
      operation: "getJournal",
      path: `/journal/${IMPL}`,
    });
    const items = (
      res.normalized as { data: { items: Array<{ directive_type: string }> } }
    ).data.items;
    expect(items.map((i) => i.directive_type)).toEqual([
      "Price",
      "Transaction",
      "Open",
      "Open",
    ]);
  });

  it("unknown plugin fails CLOSED on both (documented divergence: message text)", async () => {
    // Python: beancount loader import-error with a full traceback +
    // source {filename:"<load>",lineno:0}; v2: rustledger's clean
    // 'requires the python-plugins feature' error with source null.
    // Same allow/deny semantics — both surface exactly one load error.
    const res = await expectParity({
      operation: "getLedgerErrors",
      path: `/reports/${UNKNOWN}/errors`,
      volatileFields: ["message", "source"],
    });
    const data = (res.normalized as { data: unknown[] }).data;
    expect(data).toHaveLength(1);
  });
});
