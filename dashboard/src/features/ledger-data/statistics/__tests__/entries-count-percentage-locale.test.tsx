import { MockedProvider } from "@apollo/client/testing/react";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LedgerSearchParamsContext } from "@/common/providers/ledger-search-params-provider";
import {
  GetLedgerEntriesCountPerTypeDocument,
  type GetLedgerEntriesCountPerTypeQuery,
} from "@/graphql/definitions";
import type { SupportedLanguage } from "@/i18n/config";
import { createLocalization } from "@/i18n/init";
import { LocalizationProvider } from "@/i18n/provider";
import { EntriesCountByType } from "../entries-count-by-type";
import en from "../locales/en";
import de from "../locales/de";

vi.unmock("react-i18next");
vi.unmock("@/common/hooks/use-translations");
// Keep the actual count formatter and percentage formatter. Only the ledger's
// relevant option is supplied at this boundary; no formatter is mocked.
vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({ ledgerData: { options: { renderCommas: true } } }),
}));

// Actual public crypto-example counts for 2026 (180 total directives).
const entries: GetLedgerEntriesCountPerTypeQuery["getLedgerEntriesCountPerType"] =
  [
    { __typename: "EntriesByType", type: "Balance", number: 37 },
    { __typename: "EntriesByType", type: "Close", number: 0 },
    { __typename: "EntriesByType", type: "Commodity", number: 0 },
    { __typename: "EntriesByType", type: "Custom", number: 0 },
    { __typename: "EntriesByType", type: "Document", number: 0 },
    { __typename: "EntriesByType", type: "Event", number: 0 },
    { __typename: "EntriesByType", type: "Note", number: 0 },
    { __typename: "EntriesByType", type: "Open", number: 43 },
    { __typename: "EntriesByType", type: "Pad", number: 0 },
    { __typename: "EntriesByType", type: "Price", number: 30 },
    { __typename: "EntriesByType", type: "Query", number: 0 },
    { __typename: "EntriesByType", type: "Transaction", number: 70 },
  ];
const percentages = {
  en: ["20.6%", "23.9%", "16.7%", "38.9%", "0.0%"],
  de: [
    "20,6\u00a0%",
    "23,9\u00a0%",
    "16,7\u00a0%",
    "38,9\u00a0%",
    "0,0\u00a0%",
  ],
};
const sharedFilters = {
  searchParams: { time: "2026", account: "", filter: "" },
  setSearchParams: vi.fn(),
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

async function setup(language: SupportedLanguage, data = entries) {
  vi.spyOn(window.navigator, "language", "get").mockReturnValue("en-US");
  const localization = createLocalization();
  await localization.changeLanguage(language);
  const result = vi.fn(() => ({
    data: { getLedgerEntriesCountPerType: data },
  }));
  render(
    <LocalizationProvider localization={localization}>
      <MockedProvider
        mocks={[
          {
            request: {
              query: GetLedgerEntriesCountPerTypeDocument,
              variables: {
                ledgerId: "open_ledger/crypto-example",
                ...sharedFilters.searchParams,
              },
            },
            result,
            delay: 0,
            maxUsageCount: 10,
          },
        ]}
      >
        <LedgerSearchParamsContext.Provider value={sharedFilters}>
          <EntriesCountByType ledgerId="open_ledger/crypto-example" />
        </LedgerSearchParamsContext.Provider>
      </MockedProvider>
    </LocalizationProvider>,
  );
  await screen.findByText("Transaction");
  return { localization, result };
}

function checkRows(table: HTMLElement, language: "en" | "de") {
  const nonzero = ["Balance", "Open", "Price", "Transaction"];
  const rows = within(table).getAllByRole("row").slice(1);
  expect(rows).toHaveLength(entries.length);
  for (const [index, row] of rows.entries()) {
    const cells = within(row).getAllByRole("cell");
    expect(cells).toHaveLength(3);
    expect(cells[0]).toHaveTextContent(entries[index].type);
    expect(cells[1].textContent).toBe(String(entries[index].number));
    const valueIndex = nonzero.indexOf(entries[index].type);
    // Inspect textContent directly: German Intl includes a nonbreaking space
    // before %, which text-normalizing matchers would otherwise conceal.
    expect
      .soft(cells[2].textContent)
      .toBe(percentages[language][valueIndex < 0 ? 4 : valueIndex]);
  }
}

describe("EntriesCountByType locale percentages", () => {
  it.each([
    ["en", en],
    ["de", de],
  ] as const)(
    "renders %s one-digit percentages and eight numeric zero rows with an English browser",
    async (language, labels) => {
      const { result } = await setup(language);
      const table = screen.getByRole("table", {
        name: labels["page.statistics.entriesCountByType"].message,
      });
      expect(navigator.language).toBe("en-US");
      expect(
        within(table).getByRole("columnheader", {
          name: labels["page.statistics.percentage"].message,
        }),
      ).toBeInTheDocument();
      checkRows(table, language);
      expect(
        screen.getByText(
          language === "en"
            ? "Entries: 180 · Types: 12"
            : "Einträge: 180 · Typen: 12",
        ),
      ).toBeInTheDocument();
      expect(
        screen.queryAllByLabelText(
          labels["page.statistics.percentageNotApplicable"].message,
        ),
      ).toHaveLength(0);
      expect(result).toHaveBeenCalledTimes(1);
    },
  );

  it("updates EN→DE→EN percentages on the same mounted table without rereading its data", async () => {
    const { localization, result } = await setup("en");
    const table = screen.getByRole("table", {
      name: en["page.statistics.entriesCountByType"].message,
    });
    checkRows(table, "en");
    const cells = within(table).getAllByRole("cell");
    for (const [language, labels] of [
      ["de", de],
      ["en", en],
    ] as const) {
      await act(async () => {
        await localization.changeLanguage(language);
      });
      expect(
        screen.getByRole("table", {
          name: labels["page.statistics.entriesCountByType"].message,
        }),
      ).toBe(table);
      expect(within(table).getAllByRole("cell")).toEqual(cells);
      checkRows(table, language);
      expect(result).toHaveBeenCalledTimes(1);
    }
  });

  it("preserves localized not-applicable dashes for a zero-total period across a language change", async () => {
    const { localization, result } = await setup(
      "de",
      entries.map((entry) => ({ ...entry, number: 0 })),
    );
    for (const [language, labels] of [
      ["de", de],
      ["en", en],
    ] as const) {
      if (language === "en") {
        await act(async () => {
          await localization.changeLanguage(language);
        });
      }
      const table = screen.getByRole("table", {
        name: labels["page.statistics.entriesCountByType"].message,
      });
      const markers = within(table).getAllByLabelText(
        labels["page.statistics.percentageNotApplicable"].message,
      );
      expect(markers).toHaveLength(12);
      for (const marker of markers) expect(marker.textContent).toBe("—");
      expect(
        within(table)
          .getAllByRole("row")
          .slice(1)
          .map((row) => within(row).getAllByRole("cell")[1].textContent),
      ).toEqual(Array(12).fill("0"));
      expect(table).not.toHaveTextContent(/NaN|Infinity|%/);
      expect(
        screen.getByText(
          language === "en"
            ? "Entries: 0 · Types: 12"
            : "Einträge: 0 · Typen: 12",
        ),
      ).toBeInTheDocument();
      expect(result).toHaveBeenCalledTimes(1);
    }
  });
});
