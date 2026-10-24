import fs from "fs";
import path from "path";
import {
  pageEndedBeforeToday,
  recentTransactionsWindowToToday,
  recentTransactionsUpTo,
  recentTransactionsWindow,
  selectRecentCardState,
} from "../recent-window";

// w21/471: five pre-entered rent entries filled the "Recent Transactions" card
// and hid the coffee bought yesterday.
describe("Home's Recent Transactions window", () => {
  it("runs through the end of the month, so a later day keeps the cache key", () => {
    expect(recentTransactionsWindow("2026-10-21")).toBe(
      "0001-01-01 - 2026-10-31",
    );
    expect(recentTransactionsWindow("2026-10-22")).toBe(
      recentTransactionsWindow("2026-10-03"),
    );
    expect(recentTransactionsWindow("2026-02-10")).toBe(
      "0001-01-01 - 2026-02-28",
    );
    expect(recentTransactionsWindow("2028-02-10")).toBe(
      "0001-01-01 - 2028-02-29",
    );
  });

  it("keeps the newest rows dated up to today and drops later ones", () => {
    const rows = ["2026-10-30", "2026-10-25", "2026-10-21", "2026-10-20"].map(
      (date) => ({ date }),
    );
    expect(
      recentTransactionsUpTo(rows, "2026-10-22", 5).map((r) => r.date),
    ).toEqual(["2026-10-21", "2026-10-20"]);
    expect(recentTransactionsUpTo(rows, "2026-10-22", 1).length).toBe(1);
  });

  it("is a range the ledger's time filter reads", () => {
    // The ledger's `parseDateRange` needs both ends of a range.
    expect(
      /^\d{4}-\d{2}-\d{2} - \d{4}-\d{2}-\d{2}$/.test(
        recentTransactionsWindow("2026-10-21"),
      ),
    ).toBe(true);
  });

  it("is what the card asks for, following the day past midnight", () => {
    const card = fs
      .readFileSync(
        path.join(
          __dirname,
          "..",
          "..",
          "components",
          "recent-transactions-card.tsx",
        ),
        "utf8",
      )
      .replace(/\s+/g, "");
    expect(card.includes("time:recentTransactionsWindow(today),")).toBe(true);
    // `today` is the hook's, so a new day is a new query.
    expect(card.includes("consttoday=useToday();")).toBe(true);
  });
});

// w21/664: 27 entries booked for later this month filled the whole page, and
// the card said "Nothing up to today" beside many past transactions.
describe("a page that ran out before today", () => {
  const day = (n: number) => ({
    date: `2026-10-${String(n).padStart(2, "0")}`,
  });
  const future = Array.from({ length: 25 }, (_, i) => day(31 - (i % 9)));

  it("needs the read up to today when later entries took the whole page", () => {
    expect(pageEndedBeforeToday(future, "2026-10-22", 5, 25)).toBe(true);
    expect(recentTransactionsWindowToToday("2026-10-22")).toBe(
      "0001-01-01 - 2026-10-22",
    );
  });

  it("also covers a page with only some past rows left", () => {
    const page = [...future.slice(0, 22), day(20), day(19), day(18)];
    expect(pageEndedBeforeToday(page, "2026-10-22", 5, 25)).toBe(true);
  });

  it("leaves a page that reached five past rows, or was not full, alone", () => {
    const enough = [...future.slice(0, 20), ...[20, 19, 18, 17, 16].map(day)];
    expect(pageEndedBeforeToday(enough, "2026-10-22", 5, 25)).toBe(false);
    expect(pageEndedBeforeToday(future.slice(0, 10), "2026-10-22", 5, 25)).toBe(
      false,
    );
  });
});

// w21/700: while the read up to today loaded, Home's card held only the page's
// past rows (none, with this month full of later entries) and said "No
// transactions yet" with Add Transaction; a failed read left that for good.
describe("selectRecentCardState", () => {
  const settled = { loading: false, hasData: true, error: undefined };
  const failure = new Error("Network request failed");

  it("holds the skeleton while the read up to today is pending", () => {
    expect(
      selectRecentCardState({
        page: settled,
        past: { hasData: false, error: undefined },
        shown: 0,
      }),
    ).toBe("loading");
  });

  it("shows the failure tile when the read up to today fails", () => {
    expect(
      selectRecentCardState({
        page: settled,
        past: { hasData: false, error: failure },
        shown: 0,
      }),
    ).toBe("failed");
  });

  it("is ready once the read up to today lands, empty or not", () => {
    for (const shown of [0, 5]) {
      expect(
        selectRecentCardState({
          page: settled,
          past: { hasData: true, error: undefined },
          shown,
        }),
      ).toBe("ready");
    }
  });

  it("keeps rows already shown while the second read loads or fails", () => {
    for (const error of [undefined, failure]) {
      expect(
        selectRecentCardState({
          page: settled,
          past: { hasData: false, error },
          shown: 2,
        }),
      ).toBe("ready");
    }
  });

  it("reads as the page alone when no second read is needed", () => {
    expect(selectRecentCardState({ page: settled, past: null, shown: 0 })).toBe(
      "ready",
    );
    expect(
      selectRecentCardState({
        page: { loading: true, hasData: false, error: undefined },
        past: null,
        shown: 0,
      }),
    ).toBe("loading");
    expect(
      selectRecentCardState({
        page: { loading: false, hasData: false, error: failure },
        past: null,
        shown: 0,
      }),
    ).toBe("failed");
  });
});

describe("Home's Recent Transactions card with a second read", () => {
  const card = fs
    .readFileSync(
      path.join(
        __dirname,
        "..",
        "..",
        "components",
        "recent-transactions-card.tsx",
      ),
      "utf8",
    )
    .replace(/\s+/g, "");

  it("renders the skeleton and the failure tile from both reads", () => {
    expect(
      card.includes(
        "past:needsPast?{hasData:pastData!==undefined,error:pastError}:null,",
      ),
    ).toBe(true);
    expect(
      card.includes('cardState==="failed"?(<CardLoadFailureonRetry={retry}/>'),
    ).toBe(true);
    expect(
      card.includes('cardState==="loading"?(<RecentTransactionsSkeleton/>'),
    ).toBe(true);
  });

  it("passes the newest-entry read to the card state, and Retry reaches it", () => {
    expect(
      card.includes(
        "newest:emptyUpToToday?{hasData:newestData!==undefined,error:newestError}:null,",
      ),
    ).toBe(true);
    expect(
      card.includes(
        "refetchAll();void refetchNewestRef.current?.()".replace(/\s+/g, ""),
      ),
    ).toBe(true);
  });

  it("asks for the read up to today again on a pull to refresh or Retry", () => {
    expect(
      card.includes("if(needsPast)voidrefetchPast().catch(()=>undefined);"),
    ).toBe(true);
    expect(card.includes("if(refreshSignal>0&&ledgerId)refetchAll();")).toBe(
      true,
    );
  });
});

// w21/919: with nothing up to today the card flashed its first-run copy while
// the newest-entry read was pending, and kept it if that read failed.
describe("selectRecentCardState with the newest-entry read", () => {
  const page = { loading: false, hasData: true, error: undefined };

  it("holds the skeleton while it is pending", () => {
    expect(
      selectRecentCardState({
        page,
        past: null,
        newest: { hasData: false, error: undefined },
        shown: 0,
      }),
    ).toBe("loading");
  });

  it("shows the failure when it fails", () => {
    expect(
      selectRecentCardState({
        page,
        past: null,
        newest: { hasData: false, error: new Error("offline") },
        shown: 0,
      }),
    ).toBe("failed");
  });

  it("is ready once it landed, and not asked for when rows are shown", () => {
    expect(
      selectRecentCardState({
        page,
        past: null,
        newest: { hasData: true, error: undefined },
        shown: 0,
      }),
    ).toBe("ready");
    expect(
      selectRecentCardState({
        page,
        past: null,
        newest: { hasData: false, error: undefined },
        shown: 2,
      }),
    ).toBe("ready");
  });
});
