import fs from "fs";
import path from "path";
import { selectCardLoadState } from "../card-load-state";

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
      expect(source.includes("selectCardLoadState(")).toBe(true);
      expect(source.includes("<CardLoadFailure onRetry=")).toBe(true);
    });
  }
});
