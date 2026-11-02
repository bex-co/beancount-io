import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useQuery } from "@apollo/client/react";
import { TooltipProvider } from "@/common/components/ui/tooltip";
import { createLocalization } from "@/i18n/init";
import { LocalizationProvider } from "@/i18n/provider";
import { LedgerOutOfDateIndicator } from "../ledger-out-of-date-indicator";

vi.unmock("@/common/hooks/use-translations");
vi.unmock("react-i18next");

const { clearCache } = vi.hoisted(() => ({ clearCache: vi.fn() }));
vi.mock("@apollo/client/react", () => ({
  useQuery: vi.fn(),
  useReactiveVar: () => 0,
}));
vi.mock("@/common/hooks/use-apollo-cache", () => ({
  cacheClears: () => 0,
  useApolloCacheClear: () => clearCache,
  useLedgerWriteRefresh: () => clearCache,
}));

const latest = (sha: string) =>
  vi.mocked(useQuery).mockReturnValue({
    data: { getLatestLedgerCommit: { sha } },
  } as never);

/** The out-of-date Refresh action has a name, not only a tooltip (w4/236). */
describe.each([
  ["en", "Out of date — click to refresh"],
  ["fr", undefined],
])("LedgerOutOfDateIndicator in %s", (language, english) => {
  it("names the Refresh action once the ledger changes elsewhere", async () => {
    const localization = createLocalization();
    await localization.changeLanguage(language);
    const expected = localization.i18n.t("common.outOfDateRefresh");
    if (english) expect(expected).toBe(english);
    else expect(expected).not.toBe("Out of date — click to refresh");

    latest("a");
    const view = () => (
      <LocalizationProvider localization={localization}>
        <TooltipProvider>
          <LedgerOutOfDateIndicator ledgerId="qa/books" />
        </TooltipProvider>
      </LocalizationProvider>
    );
    const { rerender } = render(view());
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(screen.queryByRole("button")).not.toBeInTheDocument();

    latest("b");
    rerender(view());
    const button = await screen.findByRole("button", { name: expected });
    fireEvent.focus(button);
    expect(screen.getByRole("button", { name: expected })).toBe(button);

    fireEvent.click(button);
    expect(clearCache).toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.queryByRole("button")).not.toBeInTheDocument(),
    );
  });
});
