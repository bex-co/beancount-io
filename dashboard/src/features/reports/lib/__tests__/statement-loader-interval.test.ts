import { describe, expect, it, vi } from "vitest";
import type { RouterContext } from "@/common/types/router-context";
import { reportIntervalLoaderDeps } from "@/common/lib/navigation/report-interval";
import { balanceSheetLoader } from "@/features/reports/balance-sheet/loader";
import { incomeStatementLoader } from "@/features/reports/income-statement/loader";

vi.mock("@/common/hooks/use-cookie-storage-state/cookie", () => ({
  getCookie: () => undefined,
  setCookie: vi.fn(),
  removeCookie: vi.fn(),
}));

/**
 * The statement loaders prefetch with the interval the URL selected, so a
 * hard load of a Weekly link reads the same report the page then asks for
 * instead of a Monthly one beneath a Weekly label (w4/m57).
 */
describe.each([
  ["balance sheet", balanceSheetLoader],
  ["income statement", incomeStatementLoader],
] as const)("%s loader", (_, loader) => {
  async function requested(search: Record<string, unknown>) {
    const query = vi.fn((_options: { variables: Record<string, unknown> }) =>
      Promise.resolve({ data: {} }),
    );
    await loader({
      params: { ledgerOwner: "open_ledger", ledgerName: "example" },
      context: { client: { query } } as unknown as RouterContext,
      deps: reportIntervalLoaderDeps(search),
      abortController: new AbortController(),
      preload: false,
      cause: "enter",
      location: {} as never,
    } as never);
    return query.mock.calls[0]![0].variables;
  }

  it("reads the selected interval and scope", async () => {
    expect(await requested({ time: "2016", interval: "weekly" })).toMatchObject(
      { time: "2016", interval: "weekly" },
    );
  });

  it("reads monthly when the URL names no valid interval", async () => {
    expect((await requested({})).interval).toBe("monthly");
    expect((await requested({ interval: "<x>" })).interval).toBe("monthly");
  });
});
