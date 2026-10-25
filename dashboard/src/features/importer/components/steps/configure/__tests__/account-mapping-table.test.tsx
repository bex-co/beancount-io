import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormProvider, useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import { AccountMappingTable } from "../account-mapping-table";

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string) => key,
    i18n: { language: "en-US" },
  }),
}));

vi.mock("@/common/lib/errors/error-message", () => ({
  useErrorMessage: () => (error: unknown) => String(error),
}));

vi.mock("@/common/components/ledger-comboboxes", () => ({
  AccountCombobox: () => <div data-testid="account-combobox" />,
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

type Transaction = {
  id: string;
  rowIndex: number;
  date: string;
  payee: string;
  description: string;
  amount: number;
  amountInput: string;
  targetAccount: string;
  selected: boolean;
};

type FormData = {
  sourceAccount: string;
  defaultCurrency: string;
  transactions: Transaction[];
};

const defaultTransactions: Transaction[] = [
  {
    id: "row-a",
    rowIndex: 0,
    date: "2025-12-01",
    payee: "QA Coffee",
    description: "Regular purchase",
    amount: -4.5,
    amountInput: "-4.5",
    targetAccount: "Expenses:Coffee",
    selected: true,
  },
  {
    id: "row-b",
    rowIndex: 1,
    date: "2025-12-02",
    payee: "QA Grocery",
    description: "Regular purchase",
    amount: -45.67,
    amountInput: "-45.67",
    targetAccount: "Expenses:Food",
    selected: true,
  },
];

function Harness({
  transactions = defaultTransactions,
}: {
  transactions?: Transaction[];
}) {
  const form = useForm<FormData>({
    defaultValues: {
      sourceAccount: "",
      defaultCurrency: "USD",
      transactions,
    },
  });

  return (
    <FormProvider {...form}>
      <AccountMappingTable control={form.control} ledgerId="demo/books" />
    </FormProvider>
  );
}

describe("AccountMappingTable selection focus", () => {
  it("keeps focus on a row checkbox across Space toggles", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const checkbox = screen.getByRole("checkbox", {
      name: "importer.accountMapping.selectTransaction 1",
    });
    checkbox.focus();
    expect(checkbox).toHaveFocus();
    expect(checkbox).toBeChecked();

    await user.keyboard(" ");
    expect(checkbox).toHaveFocus();
    expect(checkbox).not.toBeChecked();

    await user.keyboard(" ");
    expect(checkbox).toHaveFocus();
    expect(checkbox).toBeChecked();
  });

  it("preserves hidden-row selection when deselecting visible search matches", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(
      screen.getByPlaceholderText("importer.accountMapping.searchPlaceholder"),
      "QA Coffee",
    );

    await user.click(
      screen.getByRole("checkbox", {
        name: "importer.accountMapping.selectAll",
      }),
    );

    expect(
      screen.getByRole("checkbox", {
        name: "importer.accountMapping.selectTransaction 1",
      }),
    ).not.toBeChecked();

    await user.clear(
      screen.getByPlaceholderText("importer.accountMapping.searchPlaceholder"),
    );

    expect(
      screen.getByRole("checkbox", {
        name: "importer.accountMapping.selectTransaction 1",
      }),
    ).not.toBeChecked();
    expect(
      screen.getByRole("checkbox", {
        name: "importer.accountMapping.selectTransaction 2",
      }),
    ).toBeChecked();
  });
});

describe("AccountMappingTable select-all state", () => {
  const selectAll = () =>
    screen.getByRole("checkbox", {
      name: "importer.accountMapping.selectAll",
    });

  it("is unchecked when no visible row is selected", () => {
    render(
      <Harness
        transactions={defaultTransactions.map((txn) => ({
          ...txn,
          selected: false,
        }))}
      />,
    );

    expect(selectAll()).toHaveAttribute("aria-checked", "false");
  });

  it("is indeterminate when only some visible rows are selected", () => {
    render(
      <Harness
        transactions={defaultTransactions.map((txn, index) => ({
          ...txn,
          selected: index === 0,
        }))}
      />,
    );

    expect(selectAll()).toHaveAttribute("aria-checked", "mixed");
    expect(selectAll()).toHaveAttribute("data-state", "indeterminate");
  });

  it("is checked when every visible row is selected", () => {
    render(<Harness />);

    expect(selectAll()).toHaveAttribute("aria-checked", "true");
  });

  it("becomes indeterminate after deselecting one row", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(
      screen.getByRole("checkbox", {
        name: "importer.accountMapping.selectTransaction 1",
      }),
    );

    expect(selectAll()).toHaveAttribute("aria-checked", "mixed");
  });

  it("ignores rows hidden by the search filter", async () => {
    const user = userEvent.setup();
    render(
      <Harness
        transactions={defaultTransactions.map((txn, index) => ({
          ...txn,
          selected: index === 1,
        }))}
      />,
    );

    // Both rows visible: one of two selected → mixed.
    expect(selectAll()).toHaveAttribute("aria-checked", "mixed");

    await user.type(
      screen.getByPlaceholderText("importer.accountMapping.searchPlaceholder"),
      "QA Grocery",
    );

    // Only the selected row is visible → fully checked.
    expect(selectAll()).toHaveAttribute("aria-checked", "true");

    await user.clear(
      screen.getByPlaceholderText("importer.accountMapping.searchPlaceholder"),
    );
    await user.type(
      screen.getByPlaceholderText("importer.accountMapping.searchPlaceholder"),
      "QA Coffee",
    );

    // Only the unselected row is visible → unchecked.
    expect(selectAll()).toHaveAttribute("aria-checked", "false");
  });

  it("stays disabled and unchecked when the filter hides every row", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(
      screen.getByPlaceholderText("importer.accountMapping.searchPlaceholder"),
      "no such payee",
    );

    expect(selectAll()).toBeDisabled();
    expect(selectAll()).toHaveAttribute("aria-checked", "false");
  });
});

describe("AccountMappingTable date display", () => {
  it.each(["UTC", "America/Los_Angeles", "Pacific/Apia"])(
    "renders the ledger calendar day in %s",
    (timeZone) => {
      const originalTZ = process.env.TZ;
      process.env.TZ = timeZone;
      try {
        render(
          <Harness
            transactions={[{ ...defaultTransactions[0], date: "2011-12-30" }]}
          />,
        );

        // Locale order varies; the day number must not drift (the old
        // `new Date("2011-12-30")` display showed the 29th west of Greenwich).
        const cell = screen.getByText(/2011/);
        expect(cell.textContent).toMatch(/\b30\b/);
        expect(cell.textContent).not.toMatch(/\b29\b/);
        expect(cell.textContent).not.toMatch(/\b31\b/);
      } finally {
        process.env.TZ = originalTZ;
      }
    },
  );

  it("formats dates with the selected app language, not the browser default", () => {
    render(
      <Harness
        transactions={[{ ...defaultTransactions[0], date: "2025-12-01" }]}
      />,
    );

    expect(screen.getByText("12/1/2025")).toBeInTheDocument();
  });
});

// w4/1058: tiny nonzero review amounts must not read as zero.
describe("AccountMappingTable very small amounts", () => {
  it("distinguishes ±1e-24 from explicit zero", () => {
    render(
      <Harness
        transactions={[
          {
            id: "tiny-pos",
            rowIndex: 0,
            date: "2026-10-01",
            payee: "Tiny positive",
            description: "",
            amount: 1e-24,
            amountInput: "0.000000000000000000000001",
            targetAccount: "Expenses:Food",
            selected: true,
          },
          {
            id: "tiny-neg",
            rowIndex: 1,
            date: "2026-10-02",
            payee: "Tiny negative",
            description: "",
            amount: -1e-24,
            amountInput: "-0.000000000000000000000001",
            targetAccount: "Expenses:Food",
            selected: true,
          },
          {
            id: "zero",
            rowIndex: 2,
            date: "2026-10-04",
            payee: "Explicit zero",
            description: "",
            amount: 0,
            amountInput: "0",
            targetAccount: "Expenses:Food",
            selected: true,
          },
        ]}
      />,
    );
    expect(screen.getByText("1e-24")).toBeInTheDocument();
    expect(screen.getByText("-1e-24")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
  });
});

// w4/1047: on a right-to-left page the review amount read "2.5-".
describe("AccountMappingTable amounts on a right-to-left page", () => {
  it("shows each amount as one left-to-right run, and leaves payees alone", () => {
    render(
      <div dir="rtl">
        <Harness />
      </div>,
    );
    for (const text of ["-4.5", "-45.67"]) {
      const run = screen.getByText(text);
      expect(run.tagName).toBe("BDI");
      expect(run).toHaveAttribute("dir", "ltr");
    }
    expect(screen.getByText("QA Coffee").closest("bdi")).toBeNull();
  });
});
