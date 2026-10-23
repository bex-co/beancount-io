import fs from "fs";
import path from "path";
import {
  selectCardLoadState,
  selectReadContextState,
} from "../card-load-state";

describe("selectCardLoadState", () => {
  it("fails a first load that errored, instead of reading as empty", () => {
    expect(
      selectCardLoadState({
        loading: false,
        hasData: false,
        error: new Error("x"),
      }),
    ).toBe("failed");
  });

  it("keeps cached content when only the refetch failed", () => {
    expect(
      selectCardLoadState({
        loading: false,
        hasData: true,
        error: new Error("x"),
      }),
    ).toBe("ready");
  });

  it("waits while the first load is in flight", () => {
    expect(
      selectCardLoadState({ loading: true, hasData: false, error: undefined }),
    ).toBe("loading");
  });

  it("lets a genuinely empty result show the empty state", () => {
    expect(
      selectCardLoadState({ loading: false, hasData: false, error: undefined }),
    ).toBe("ready");
  });
});

/**
 * Static guardrail: every card that renders an affirmative empty state from a
 * query checks for a failed first load before it gets there.
 */
describe("empty states behind a failed query", () => {
  const SRC = path.join(__dirname, "..", "..", "..");
  for (const file of [
    "screens/home-screen/components/recent-transactions-card.tsx",
    "screens/home-screen/components/spending-card.tsx",
    "screens/home-screen/components/feed-card.tsx",
    "screens/reports-screen/components/account-transactions-card.tsx",
    "screens/notifications-screen/notifications-screen.tsx",
    "screens/commit-detail-screen/commit-detail-screen.tsx",
  ]) {
    it(`${file} shows the load failure before any empty state`, () => {
      const source = fs.readFileSync(path.join(SRC, file), "utf8");
      // Recent Transactions folds its two reads through `selectRecentCardState`,
      // which is built on `selectCardLoadState` (w21/700).
      expect(
        source.includes("selectCardLoadState(") ||
          (file.endsWith("recent-transactions-card.tsx") &&
            source.includes("selectRecentCardState(")),
      ).toBe(true);
      expect(/<CardLoadFailure\s+onRetry=/.test(source)).toBe(true);
    });
  }
});

// w21/262: until the ledger's read context lands, the currency falls back to
// "USD", so a EUR ledger's Home and Accounts flashed a USD headline of 0.
describe("selectReadContextState", () => {
  it("holds while the context has neither arrived nor failed", () => {
    expect(selectReadContextState(undefined, undefined)).toBe("loading");
  });

  it("is ready once it arrives, even if a refresh failed", () => {
    expect(selectReadContextState({ getLedger: {} }, undefined)).toBe("ready");
    expect(selectReadContextState({ getLedger: {} }, new Error("net"))).toBe(
      "ready",
    );
  });

  it("is failed when the first load failed and nothing is cached", () => {
    expect(selectReadContextState(undefined, new Error("net"))).toBe("failed");
  });
});

describe("the screens that name a currency from the read context", () => {
  const read = (...parts: string[]) =>
    require("fs")
      .readFileSync(
        require("path").join(__dirname, "..", "..", "..", ...parts),
        "utf8",
      )
      .replace(/\s+/g, "");

  it("hold their skeletons and fail instead of rendering in the USD fallback", () => {
    const home = read("screens", "home-screen", "home-screen.tsx");
    expect(
      home.includes(
        "constcontextState=selectReadContextState(ledgerMeta,ledgerMetaError);",
      ),
    ).toBe(true);
    expect(home.includes('contextState==="loading"||')).toBe(true);
    expect(home.includes('contextState==="failed"')).toBe(true);
    expect(home.includes("onRetry={retryChart}")).toBe(true);

    const spending = read(
      "screens",
      "home-screen",
      "components",
      "spending-card.tsx",
    );
    expect(
      spending.includes("selectReadContextState(context.data,context.error)"),
    ).toBe(true);
    expect(spending.includes('contextState==="failed"||')).toBe(true);

    const accounts = read("screens", "accounts-screen", "accounts-screen.tsx");
    expect(
      accounts.includes("selectReadContextState(ledgerMeta,ledgerMetaError)"),
    ).toBe(true);
    expect(
      accounts.includes('contextState==="loading"||!closeDatesSettled||'),
    ).toBe(true);
    expect(accounts.includes('contextState==="failed"||')).toBe(true);

    const charts = read(
      "screens",
      "home-screen",
      "components",
      "account-charts-card.tsx",
    );
    expect(charts.includes("<CardLoadFailureonRetry={onRetry}/>")).toBe(true);
  });
});
