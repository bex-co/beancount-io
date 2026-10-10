import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GetLedgerEntryContextQuery } from "@/graphql/definitions";
import { en, de } from "@/i18n/locales";
import { EntryContextPanel } from "../entry-context-panel";

vi.unmock("@/common/hooks/use-translations");
vi.unmock("react-i18next");

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  mutate: vi.fn(),
  fileNavigate: vi.fn(),
}));
vi.mock("@apollo/client/react", () => ({
  useQuery: mocks.query,
  useMutation: () => [mocks.mutate, {}],
}));
vi.mock("@/common/hooks/use-ledger-permission", () => ({
  useLedgerPermission: () => ({ canWrite: false }),
}));
vi.mock("@/common/hooks/use-file-navigate", () => ({
  useFileNavigate: () => mocks.fileNavigate,
}));
vi.mock("@/common/hooks/use-apollo-cache", () => ({
  useApolloCacheClear: () => vi.fn(),
}));
vi.mock("@/common/hooks/use-theme", () => ({ useIsDarkTheme: () => false }));
vi.mock("@/common/hooks/use-mobile", () => ({ useIsMobile: () => false }));
vi.mock("@/common/lib/editor/monaco-beancount-language-vscode", () => ({
  registerBeancountLanguage: vi.fn(),
}));
vi.mock("@/common/components/monaco-editor", () => ({
  MonacoEditor: ({
    value,
    options,
  }: {
    value: string;
    options: { readOnly: boolean };
  }) => (
    <textarea
      aria-label="entry-source"
      value={value}
      readOnly={options.readOnly}
    />
  ),
}));

// Partial context fixture: the observed Equity amounts and source location
// are retained; additional synthetic inventories exercise unchanged formatting.
const context: GetLedgerEntryContextQuery["getLedgerEntryContext"] = {
  __typename: "EntryContext",
  entry: { meta: { filename: "FY2025/FY2025.bean", lineno: 107 } },
  slice: '2025-12-31 * "Adyen N.V." "FY2025 Income Statement"\n',
  sha256sum: "synthetic-context-sha",
  managed_source: null,
  balances_before: {
    "Equity:Adjustments": "32891112000.00 EUR",
    "Assets:Brokerage": "150 ACME\n-10230.00 USD",
    "Expenses:Precise": {
      number: "-9007199254740993.123456789",
      currency: "EUR",
    },
    "Assets:Empty": "",
  },
  balances_after: {
    "Assets:Empty": "",
    "Expenses:Precise": {
      number: "9007199254740993.123456788",
      currency: "EUR",
    },
    "Equity:Adjustments": "33953638000.00 EUR",
    "Assets:Brokerage": "175 ACME\n-10230.00 USD\n0.000000001 GLD",
  },
};
const beforeRows = [
  ["Equity:Adjustments", "32891112000.00 EUR"],
  ["Assets:Brokerage", "150 ACME\n-10230.00 USD"],
  ["Expenses:Precise", "-9007199254740993.123456789 EUR"],
  ["Assets:Empty", ""],
];
const afterRows = [
  ["Assets:Empty", ""],
  ["Expenses:Precise", "9007199254740993.123456788 EUR"],
  ["Equity:Adjustments", "33953638000.00 EUR"],
  ["Assets:Brokerage", "175 ACME\n-10230.00 USD\n0.000000001 GLD"],
];
const labels = {
  en: {
    before: "Balances before entry",
    after: "Balances after entry",
    account: "Account",
    balance: "Balance",
  },
  de: {
    before: "Salden vor der Buchung",
    after: "Salden nach der Buchung",
    account: "Konto",
    balance: "Saldo",
  },
};
let i18n = createInstance();

beforeEach(async () => {
  vi.clearAllMocks();
  mocks.query.mockReturnValue({
    data: { getLedgerEntryContext: context },
    loading: false,
  });
  i18n = createInstance();
  await i18n.init({
    lng: "en",
    fallbackLng: "en",
    resources: { en: { translation: en }, de: { translation: de } },
    interpolation: { escapeValue: false, prefix: "{", suffix: "}" },
  });
});
afterEach(cleanup);

function tableRows(table: HTMLElement) {
  return within(table)
    .getAllByRole("row")
    .slice(1)
    .map((row) =>
      within(row)
        .getAllByRole("cell")
        .map((cell) => cell.textContent),
    );
}

function expectTable(
  name: string,
  language: keyof typeof labels,
  rows: string[][],
) {
  const table = screen.getByRole("table", { name, exact: true });
  expect(table.tagName).toBe("TABLE");
  const titleId = table.getAttribute("aria-labelledby")!;
  expect(document.getElementById(titleId)).toHaveTextContent(name);
  const headers = within(table).getAllByRole("columnheader");
  expect(headers.map((header) => header.textContent)).toEqual([
    labels[language].account,
    labels[language].balance,
  ]);
  for (const header of headers) {
    expect(header.tagName).toBe("TH");
    expect(header).toHaveAttribute("scope", "col");
  }
  expect(tableRows(table)).toEqual(rows);
  return table;
}

describe("source-backed Entry Context balance tables", () => {
  it.each(["en", "de"] as const)(
    "names and labels both phases in %s while retaining exact inventories and reader/source controls",
    async (language) => {
      await i18n.changeLanguage(language);
      const catalog = language === "en" ? en : de;
      const user = userEvent.setup();
      const onSourceNavigate = vi.fn();
      render(
        <I18nextProvider i18n={i18n}>
          <EntryContextPanel
            entryHash="673c74728eba5dbf39b83560352699e9"
            ledgerId="open_ledger/adyen"
            onSourceNavigate={onSourceNavigate}
          />
        </I18nextProvider>,
      );
      const disclosure = screen.getByRole("button", {
        name: catalog["journal.entryContext"],
        exact: true,
      });
      expect(disclosure).toHaveAttribute("aria-expanded", "false");
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
      await user.tab(); // Source navigation precedes the balance disclosure.
      await user.tab();
      expect(disclosure).toHaveFocus();
      await user.keyboard("{Enter}");
      expect(disclosure).toHaveAttribute("aria-expanded", "true");
      const before = expectTable(labels[language].before, language, beforeRows);
      const after = expectTable(labels[language].after, language, afterRows);
      expect(before.getAttribute("aria-labelledby")).not.toBe(
        after.getAttribute("aria-labelledby"),
      );
      const titleIds = [before, after].map((table) =>
        table.getAttribute("aria-labelledby"),
      );
      expect(screen.getAllByRole("table")).toHaveLength(2);

      await user.keyboard("{Enter}");
      expect(disclosure).toHaveAttribute("aria-expanded", "false");
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
      expect(disclosure).toHaveFocus();
      await user.keyboard("{Enter}");
      expect(
        [
          expectTable(labels[language].before, language, beforeRows),
          expectTable(labels[language].after, language, afterRows),
        ].map((table) => table.getAttribute("aria-labelledby")),
      ).toEqual(titleIds);

      expect(screen.getByRole("textbox", { name: "entry-source" })).toHaveValue(
        context.slice,
      );
      expect(
        screen.getByRole("textbox", { name: "entry-source" }),
      ).toHaveAttribute("readonly");
      expect(
        screen.queryByRole("button", {
          name: catalog["common.save"],
          exact: true,
        }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", {
          name: catalog["common.delete"],
          exact: true,
        }),
      ).not.toBeInTheDocument();
      await user.tab({ shift: true });
      const source = screen.getByRole("button", {
        name: i18n.t("journal.openEntrySource", {
          location: "FY2025/FY2025.bean:107",
        }),
      });
      expect(source).toHaveFocus();
      await user.keyboard("{Enter}");
      expect(onSourceNavigate).toHaveBeenCalledOnce();
      expect(mocks.fileNavigate).toHaveBeenCalledWith(
        "open_ledger/adyen",
        "file",
        "FY2025/FY2025.bean",
        { lineNumber: 107, editMode: false },
      );
      expect(mocks.mutate).not.toHaveBeenCalled();
    },
  );

  it("updates live locale names and headers without changing the table identities or balances", async () => {
    const user = userEvent.setup();
    render(
      <I18nextProvider i18n={i18n}>
        <EntryContextPanel entryHash="hash" ledgerId="open_ledger/adyen" />
      </I18nextProvider>,
    );
    await user.click(
      screen.getByRole("button", {
        name: en["journal.entryContext"],
        exact: true,
      }),
    );
    const before = expectTable(labels.en.before, "en", beforeRows);
    const after = expectTable(labels.en.after, "en", afterRows);
    const titleIds = [before, after].map((table) =>
      table.getAttribute("aria-labelledby"),
    );
    await act(async () => {
      await i18n.changeLanguage("de");
    });
    expect(expectTable(labels.de.before, "de", beforeRows)).toBe(before);
    expect(expectTable(labels.de.after, "de", afterRows)).toBe(after);
    expect(
      [before, after].map((table) => table.getAttribute("aria-labelledby")),
    ).toEqual(titleIds);
    expect(
      screen.queryByRole("table", { name: labels.en.before }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("table", { name: labels.en.after }),
    ).not.toBeInTheDocument();
  });

  it("keeps title IDs distinct when two source-backed panels are mounted", async () => {
    const user = userEvent.setup();
    render(
      <I18nextProvider i18n={i18n}>
        <EntryContextPanel entryHash="first" ledgerId="open_ledger/adyen" />
        <EntryContextPanel entryHash="second" ledgerId="open_ledger/adyen" />
      </I18nextProvider>,
    );
    for (const disclosure of screen.getAllByRole("button", {
      name: en["journal.entryContext"],
      exact: true,
    })) {
      await user.click(disclosure);
    }
    const beforeTables = screen.getAllByRole("table", {
      name: labels.en.before,
      exact: true,
    });
    const afterTables = screen.getAllByRole("table", {
      name: labels.en.after,
      exact: true,
    });
    const tables = [...beforeTables, ...afterTables];
    expect(tables).toHaveLength(4);
    const titleIds = tables.map((table) =>
      table.getAttribute("aria-labelledby"),
    );
    expect(new Set(titleIds).size).toBe(4);
    tables.forEach((table) => {
      expect(
        document.getElementById(table.getAttribute("aria-labelledby")!),
      ).not.toBeNull();
    });
    expect(beforeTables.map(tableRows)).toEqual([beforeRows, beforeRows]);
    expect(afterTables.map(tableRows)).toEqual([afterRows, afterRows]);
  });
});
