import {
  expectParity,
  PYTHON_URL,
  userBasicAuthHeader,
} from "../expect-parity";
import { PARITY_USER } from "../seed";

const BOOK = `parityuser/book`;

/** Fetch a value from the PYTHON oracle to parameterize dependent requests. */
async function fromOracle<T>(path: string): Promise<T> {
  const res = await fetch(`${PYTHON_URL}${path}`, {
    headers: { Authorization: userBasicAuthHeader() },
  });
  const body = (await res.json()) as { data: T };
  return body.data;
}

describe("parity: reports (simple reads)", () => {
  const simple = [
    "attributes",
    "errors",
    "commodities",
    "events",
    "documents",
    "narrations",
    "payees",
    "links",
    "years",
    "currencies",
    "tags",
    "source-files",
    "accounts",
    "account_last_entries",
    "entries_count_per_type",
    "options",
    "fava-options",
    "beancountio-options",
    "plugins",
  ] as const;

  const OP_IDS: Record<string, string> = {
    attributes: "getLedgerAttributes",
    errors: "getLedgerErrors",
    commodities: "getLedgerCommodities",
    events: "getLedgerEvents",
    documents: "getLedgerDocuments",
    narrations: "getLedgerNarrations",
    payees: "getLedgerPayees",
    links: "getLedgerLinks",
    years: "getLedgerYears",
    currencies: "getLedgerCurrencies",
    tags: "getLedgerTags",
    "source-files": "getLedgerSourceFiles",
    accounts: "getLedgerAccounts",
    account_last_entries: "getLedgerAccountLastEntries",
    entries_count_per_type: "getLedgerEntriesCountPerType",
    options: "getLedgerOptions",
    "fava-options": "getLedgerFavaOptions",
    "beancountio-options": "getLedgerBcioOptions",
    plugins: "getLedgerPlugins",
    "income-statement": "getLedgerIncomeStatement",
    "trial-balance": "getLedgerTrialBalance",
    "balance-sheet": "getLedgerBalanceSheet",
    overview: "getLedgerOverview",
  };

  for (const path of simple) {
    it(`GET /reports/.../${path}`, async () => {
      const res = await expectParity({
        operation: OP_IDS[path] ?? path,
        path: `/reports/${BOOK}/${path}`,
      });
      expect(res.status).toBe(200);
    });
  }

  it("payee/narration-dependent reads", async () => {
    const payees = await fromOracle<string[]>(`/reports/${BOOK}/payees`);
    const narrations = await fromOracle<string[]>(
      `/reports/${BOOK}/narrations`,
    );
    if (payees.length > 0) {
      const p = encodeURIComponent(payees[0]);
      expect(
        (
          await expectParity({
            operation: "getLedgerPayeeTransactions",
            path: `/reports/${BOOK}/payee-transactions`,
            query: { payee: payees[0] },
          })
        ).status,
      ).toBe(200);
      expect(
        (
          await expectParity({
            operation: "getLedgerPayeeAccounts",
            path: `/reports/${BOOK}/payee-accounts`,
            query: { payee: payees[0] },
          })
        ).status,
      ).toBe(200);
      void p;
    }
    if (narrations.length > 0) {
      expect(
        (
          await expectParity({
            operation: "getLedgerNarrationTransactions",
            path: `/reports/${BOOK}/narration-transactions`,
            query: { narration: narrations[0] },
          })
        ).status,
      ).toBe(200);
    }
  });

  it("hierarchy / interval-totals / account_report for the assets root", async () => {
    const accountsMap = await fromOracle<Record<string, unknown>>(
      `/reports/${BOOK}/accounts`,
    );
    const root = (Object.keys(accountsMap)[0] ?? "Assets").split(":")[0];

    expect(
      (
        await expectParity({
          operation: "getLedgerHierarchy",
          path: `/reports/${BOOK}/hierarchy`,
          query: { account_name: root, conversion: "USD" },
        })
      ).status,
    ).toBe(200);

    expect(
      (
        await expectParity({
          operation: "getLedgerIntervalTotals",
          path: `/reports/${BOOK}/interval-totals`,
          query: { account_name: root, interval: "month", conversion: "USD" },
        })
      ).status,
    ).toBe(200);

    expect(
      (
        await expectParity({
          operation: "getLedgerAccountReport",
          path: `/reports/${BOOK}/account_report`,
          query: { account_name: root, conversion: "units" },
        })
      ).status,
    ).toBe(200);
  });
});

const OP_IDS_STMT: Record<string, string> = {
  "income-statement": "getLedgerIncomeStatement",
  "trial-balance": "getLedgerTrialBalance",
  "balance-sheet": "getLedgerBalanceSheet",
  overview: "getLedgerOverview",
};

describe("parity: financial statements", () => {
  const statements = [
    "income-statement",
    "trial-balance",
    "balance-sheet",
    "overview",
  ] as const;

  for (const path of statements) {
    it(`GET /reports/.../${path} (plain + time + conversion)`, async () => {
      expect(
        (
          await expectParity({
            operation: OP_IDS_STMT[path],
            path: `/reports/${BOOK}/${path}`,
          })
        ).status,
      ).toBe(200);

      expect(
        (
          await expectParity({
            operation: OP_IDS_STMT[path],
            path: `/reports/${BOOK}/${path}`,
            query: { time: "2023", conversion: "USD" },
          })
        ).status,
      ).toBe(200);
    });
  }
});

describe("parity: journal reads", () => {
  it("getJournal — plain, paged, filtered", async () => {
    expect(
      (
        await expectParity({
          operation: "getJournal",
          path: `/journal/${BOOK}`,
        })
      ).status,
    ).toBe(200);

    expect(
      (
        await expectParity({
          operation: "getJournal",
          path: `/journal/${BOOK}`,
          query: { limit: 5, offset: 2 },
        })
      ).status,
    ).toBe(200);

    expect(
      (
        await expectParity({
          operation: "getJournal",
          path: `/journal/${BOOK}`,
          query: { time: "2023" },
        })
      ).status,
    ).toBe(200);
  });

  it("plaintextJournal", async () => {
    expect(
      (
        await expectParity({
          operation: "plaintextJournal",
          path: `/journal/${BOOK}/plaintext`,
        })
      ).status,
    ).toBe(200);
  });

  it("getAccountJournal for the assets root", async () => {
    const accountsMap = await fromOracle<Record<string, unknown>>(
      `/reports/${BOOK}/accounts`,
    );
    const names = Object.keys(accountsMap);
    const account = names.find((a) => a.includes(":")) ?? names[0];
    expect(
      (
        await expectParity({
          operation: "getAccountJournal",
          path: `/journal/${BOOK}/account-journal`,
          query: { account, with_children: true },
        })
      ).status,
    ).toBe(200);
  });

  it("getContext — per-target entry hash from each service's own journal", async () => {
    const journalOf = async (base: string): Promise<string> => {
      const res = await fetch(`${base}/journal/${PARITY_USER}/book?limit=1`, {
        headers: { Authorization: userBasicAuthHeader() },
      });
      const body = (await res.json()) as {
        data: { items: Array<{ entry_hash?: string }> };
      };
      return body.data.items[0]?.entry_hash ?? "";
    };
    const V2 = process.env.PARITY_V2_URL || "http://localhost:18002";
    const hashes = {
      python: await journalOf(PYTHON_URL),
      v2: await journalOf(V2),
    };
    expect(hashes.python).not.toBe("");
    expect(hashes.v2).not.toBe("");

    const res = await expectParity({
      operation: "getContext",
      path: `/journal/${BOOK}/context/{{hash}}`,
      vars: { hash: hashes },
      // the echoed hash + location-dependent meta of the entry differ
      volatileFields: ["entry_hash", "filename", "lineno"],
    });
    expect(res.status).toBe(200);
  });
});

describe("parity: shell", () => {
  it("queryShell — table result", async () => {
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

  it("queryShellText — text output", async () => {
    const res = await expectParity({
      operation: "queryShellText",
      path: `/shell/${BOOK}/query-text`,
      query: {
        query: "SELECT account GROUP BY account ORDER BY account LIMIT 5",
      },
    });
    expect(res.status).toBe(200);
  });

  it("queryShell — invalid BQL fails on both (documented divergence: python 500, v2 400)", async () => {
    // The Python service surfaces parse errors as 500 (generic FavaAPIError
    // handler); v2 deliberately returns a structured 400 (BadUserInputError)
    // with a richer parser message — see parity/README.md. backend-v2 treats
    // any !success response as failure, so the contract impact is nil.
    const call = async (base: string) =>
      fetch(`${base}/shell/${BOOK}/query?query=SELEC+nonsense+FRM`, {
        headers: { Authorization: userBasicAuthHeader() },
      });
    const V2 = process.env.PARITY_V2_URL || "http://localhost:18002";
    const py = await call(PYTHON_URL);
    const v2 = await call(V2);
    expect(py.status).toBe(500);
    expect(v2.status).toBe(400);
    expect(((await v2.json()) as { success: boolean }).success).toBe(false);
  });
});

describe("parity: legacy journal", () => {
  it("plain and paginated", async () => {
    expect(
      (
        await expectParity({
          operation: "getLegacyJournal",
          path: `/legacy/journal/${BOOK}`,
          query: { first: 10 },
        })
      ).status,
    ).toBe(200);

    expect(
      (
        await expectParity({
          operation: "getLegacyJournal",
          path: `/legacy/journal/${BOOK}`,
          query: { last: 5, sort_by: "amount", sort_order: "asc" },
        })
      ).status,
    ).toBe(200);
  });

  it("filters + detailed mode (entry_hash masked — documented divergence)", async () => {
    expect(
      (
        await expectParity({
          operation: "getLegacyJournal",
          path: `/legacy/journal/${BOOK}`,
          query: { entry_types: "Transaction", first: 5, detailed: true },
          volatileFields: ["entry_hash"],
        })
      ).status,
    ).toBe(200);
  });
});
