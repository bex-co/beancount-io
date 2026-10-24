import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OpenAccountDialog } from "../open-account-dialog";
import { OpenAccountForm } from "@/features/journal/components/new-directive-dialog/open-account-form";

vi.mock("@apollo/client/react", () => ({
  useMutation: () => [vi.fn(), { loading: false }],
  useQuery: (document: { definitions: { name?: { value: string } }[] }) =>
    document.definitions[0]?.name?.value === "GetLedgerAccountDirectives"
      ? {
          data: {
            getLedgerAccountDirectives: [
              {
                account: "Assets:Cash",
                openedAt: "2026-01-01",
                closedAt: null,
              },
              {
                account: "Equity:Opening-Balances",
                openedAt: "2026-01-01",
                closedAt: null,
              },
              {
                account: "Assets:OldBank",
                openedAt: "2025-01-01",
                closedAt: "2025-12-31",
              },
            ],
          },
          loading: false,
        }
      : {
          data: {
            getLedger: {
              options: {
                nameAssets: "Assets",
                nameLiabilities: "Liabilities",
                nameEquity: "Equity",
                nameIncome: "Income",
                nameExpenses: "Expenses",
              },
            },
          },
          loading: false,
        },
}));

vi.mock("@/common/lib/errors/error-message", () => ({
  useErrorMessage: () => () => "error",
}));

vi.mock("@/common/hooks/use-date-locale", async () => {
  const { enUS } = await import("react-day-picker/locale/en-US");
  return { useDateLocale: () => enUS };
});

const surfaces = [
  {
    name: "the Accounts page dialog",
    render: () =>
      render(<OpenAccountDialog open onOpenChange={() => {}} ledgerId="o/l" />),
    field: () => screen.getByLabelText("Account Name"),
    submit: () => screen.getByRole("button", { name: "Open Account" }),
  },
  {
    name: "New Entry's Account tab",
    render: () => render(<OpenAccountForm ledgerId="o/l" />),
    field: () => screen.getByLabelText("Account"),
    submit: () => screen.getByRole("button", { name: "Create Account Entry" }),
  },
];

describe.each(surfaces)("Open Account in $name (w3/557)", (surface) => {
  const type = async (value: string) => {
    fireEvent.change(surface.field(), { target: { value } });
    await waitFor(() => expect(surface.field()).toHaveValue(value));
  };

  it.each([
    ["Assets:Cash", "Assets:Cash is already open (since 2026-01-01)."],
    [
      "Equity:Opening-Balances",
      "Equity:Opening-Balances is already open (since 2026-01-01).",
    ],
    [
      "Assets:OldBank",
      "Assets:OldBank was closed on 2025-12-31; Beancount can't open it again.",
    ],
  ])("refuses %s with its dates", async (account, message) => {
    surface.render();
    await type(account);

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(surface.submit()).toBeDisabled();
  });

  it("accepts a new child of an open account", async () => {
    surface.render();
    await type("Assets:Cash:Wallet");

    await waitFor(() => expect(surface.submit()).toBeEnabled());
    expect(screen.queryByText(/already open/)).not.toBeInTheDocument();
  });

  it("keeps the prefix message for a case-different name", async () => {
    surface.render();
    await type("assets:cash");

    expect(
      await screen.findByText(/^Account must start with one of:/),
    ).toBeInTheDocument();
    expect(surface.submit()).toBeDisabled();
  });
});

describe.each(surfaces)(
  "Unicode account names in $name (w4/279)",
  (surface) => {
    it.each([
      ["Devanagari marks", "Assets:Qa-20261020:\u0939\u093F\u0902\u0926\u0940"],
      ["a decomposed accent", "Assets:Qa-20261020:E\u0301pargne"],
      ["a titlecase initial", "Assets:Qa-20261020:\u01C5ep"],
    ])("accepts %s exactly as typed", async (_, account) => {
      surface.render();
      fireEvent.change(surface.field(), { target: { value: account } });

      await waitFor(() => expect(surface.submit()).toBeEnabled());
      expect(surface.field()).toHaveValue(account);
      expect(surface.field()).not.toHaveAttribute("aria-invalid", "true");
    });

    it("still refuses a component led by a combining mark", async () => {
      surface.render();
      fireEvent.change(surface.field(), {
        target: { value: "Assets:\u0301Epargne" },
      });

      await waitFor(() =>
        expect(surface.field()).toHaveAttribute("aria-invalid", "true"),
      );
      expect(surface.submit()).toBeDisabled();
    });
  },
);

describe.each(surfaces)(
  "Joined and numbered account names in $name (w4/1048)",
  (surface) => {
    it.each([
      ["a Persian name with its ZWNJ", "Assets:فارسی‌حساب"],
      ["a conjunct with its ZWJ", "Assets:Qaक्‍ष"],
      ["a superscript digit after the start", "Assets:Qa²"],
      ["a Roman numeral after the start", "Assets:QaⅣ"],
    ])("accepts %s exactly as typed", async (_, account) => {
      surface.render();
      fireEvent.change(surface.field(), { target: { value: account } });

      await waitFor(() => expect(surface.submit()).toBeEnabled());
      expect(surface.field()).toHaveValue(account);
      expect(surface.field()).not.toHaveAttribute("aria-invalid", "true");
    });

    it.each([
      ["Arabic-Indic", "١٢٣"],
      ["Persian", "۱۴۰۲"],
      ["full-width", "１２３"],
    ])(
      "refuses a component led by %s digits, says why, and recovers",
      async (_, component) => {
        surface.render();
        fireEvent.change(surface.field(), {
          target: { value: `Assets:${component}` },
        });

        expect(
          await screen.findByText(
            `Each part must start with a capital letter or a digit 0–9 — “${component}” doesn't (for example Assets:Bank).`,
          ),
        ).toBeInTheDocument();
        expect(surface.field()).toHaveAttribute("aria-invalid", "true");
        expect(surface.submit()).toBeDisabled();

        // The same digits after an ASCII-led start are a valid name.
        fireEvent.change(surface.field(), {
          target: { value: `Assets:Qa${component}` },
        });
        await waitFor(() => expect(surface.submit()).toBeEnabled());
        expect(surface.field()).not.toHaveAttribute("aria-invalid", "true");
      },
    );
  },
);
