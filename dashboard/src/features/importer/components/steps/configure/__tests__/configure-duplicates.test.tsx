import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  Observable,
} from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TransactionConfigForm } from "../transaction-config-form";
import type { ParsedRow } from "../../../../types";

/**
 * Smart Import booked a re-uploaded or overlapping bank file a second time,
 * row for row, with nothing to say it was already there (w2/122). Configure
 * now reads the source account's transactions over the file's days and
 * leaves the rows the ledger holds unselected, with a note on each.
 */
vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key} ${JSON.stringify(params)}` : key,
    i18n: { language: "en" },
  }),
}));
vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({ primaryCurrency: "USD" }),
}));
vi.mock("@/common/components/ledger-comboboxes", () => ({
  AccountCombobox: ({
    value,
    onValueChange,
    placeholder,
  }: {
    value: string;
    onValueChange: (value: string) => void;
    placeholder?: string;
  }) => (
    <input
      aria-label={placeholder ?? "account"}
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
    />
  ),
  CurrencyCombobox: ({
    value,
    onValueChange,
  }: {
    value: string;
    onValueChange: (value: string) => void;
  }) => (
    <input
      aria-label="currency"
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
    />
  ),
}));
vi.mock("../../../../hooks/use-ai-categorization", () => ({
  useAICategorization: () => ({
    categorizeTransactions: vi.fn(),
    loading: false,
  }),
}));

const row = (id: string, date: string, payee: string, amountInput: string) =>
  ({
    id,
    date,
    payee,
    description: id,
    amount: Number(amountInput),
    amountInput,
  }) as ParsedRow;

const FILE = [
  row("coffee", "2026-09-02", "qa-imp-a", "-3.25"),
  row("bus", "2026-09-03", "qa-imp-b", "-2.75"),
];

/** The ledger after the file was imported once. */
const BOOKED = [
  { date: "2026-09-02", number: "-3.25" },
  { date: "2026-09-03", number: "-2.75" },
].map(({ date, number }) => ({
  directive_type: "Transaction",
  date,
  entry_hash: date,
  flag: "*",
  payee: "qa",
  narration: "",
  tags: [],
  links: [],
  postings: [
    { account: "Assets:Cash", units: { number, currency: "USD" } },
    {
      account: "Expenses:Food",
      units: { number: number.slice(1), currency: "USD" },
    },
  ],
}));

const onSubmit = vi.fn();

function renderForm(journal: unknown[]) {
  const reads: Array<Record<string, unknown>> = [];
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      (operation) =>
        new Observable((observer) => {
          reads.push(operation.variables);
          observer.next({
            data: {
              getLedgerJournal: {
                __typename: "JournalResponse",
                total: journal.length,
                data: journal,
                is_empty: journal.length === 0,
              },
            },
          });
          observer.complete();
        }),
    ),
  });
  render(
    <ApolloProvider client={client}>
      <TransactionConfigForm
        rows={FILE}
        ledgerId="owner/ledger"
        configDraft={null}
        onConfigDraftChange={() => {}}
        onSubmit={onSubmit}
        onBack={() => {}}
        isSubmitting={false}
      />
    </ApolloProvider>,
  );
  return { reads, user: userEvent.setup() };
}

const checkboxes = () =>
  screen.getAllByRole("checkbox", {
    name: /importer\.accountMapping\.selectTransaction \d/,
  });

async function mapAccounts(user: ReturnType<typeof userEvent.setup>) {
  await user.type(
    screen.getByLabelText("importer.configure.sourceAccountPlaceholder"),
    "Assets:Cash",
  );
  for (const target of screen.getAllByLabelText(
    "importer.accountMapping.selectAccountPlaceholder",
  )) {
    await user.type(target, "Expenses:Food");
  }
}

describe("Configure flags rows the ledger already holds", () => {
  beforeEach(() => onSubmit.mockClear());

  it("leaves both rows of a re-imported file unselected, each marked", async () => {
    const { reads, user } = renderForm(BOOKED);
    await mapAccounts(user);

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        'importer.configure.duplicatesFound {"count":2}',
      ),
    );
    expect(reads.at(-1)).toMatchObject({
      ledgerId: "owner/ledger",
      query: { account: "Assets:Cash", time: "2026-09-02 - 2026-09-03" },
    });
    expect(
      screen.getAllByText(/importer\.configure\.alreadyInLedger/),
    ).toHaveLength(2);
    for (const box of checkboxes()) expect(box).not.toBeChecked();
    expect(
      screen.getByRole("button", { name: /importer\.configure\.importButton/ }),
    ).toBeDisabled();
  });

  it("lets the reader import a flagged row deliberately", async () => {
    const { user } = renderForm(BOOKED);
    await mapAccounts(user);
    await waitFor(() => expect(checkboxes()[0]).not.toBeChecked());

    await user.click(checkboxes()[1]!);
    expect(checkboxes()[1]).toBeChecked();
    await user.click(
      screen.getByRole("button", { name: /importer\.configure\.importButton/ }),
    );
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]![0]).toEqual([
      expect.objectContaining({ date: "2026-09-03", amount: "-2.75" }),
    ]);
  });

  it("selects every row of a file the ledger has not seen", async () => {
    const { reads, user } = renderForm([]);
    await mapAccounts(user);
    await waitFor(() => expect(reads.length).toBeGreaterThan(0));
    expect(screen.queryByRole("status")).toBeNull();
    for (const box of checkboxes()) expect(box).toBeChecked();
  });
});
